import { Router } from "express";
import multer from "multer";
import { ethers } from "ethers";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { publishHcsEvent } from "../services/hedera.js";
import {
  computeDHash,
  embedWatermark,
  generateSecret,
  generateContentId,
  generateCommitment,
} from "@modzero/watermark";
import { registerContentOnChain, createPostOnChain, getPostOnChain, getReputationOnChain, checkValidLicenseOnChain, createClaimOnChain, getClaimOnChain } from "../services/blockchain.js";
import { saveContent } from "../database/contentRepo.js";
import { savePost, getPostById, listPosts } from "../database/postRepo.js";
import { findBestMatch, SIMILARITY_THRESHOLD } from "../services/matcher.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

/**
 * POST /post  (multipart/form-data)
 * Fields: text (required), creatorAddress (required), image (optional file)
 *
 * If an image is present, it goes through the FULL existing content
 * pipeline (fingerprint, watermark, ContentRegistry) exactly as /content
 * does — a post's image is not a separate, lighter system. The post
 * itself is then registered separately via PostRegistry, referencing the
 * image's contentId if one exists (spec extension: posts).
 */
router.post("/post", upload.single("image"), async (req, res) => {
  try {
    const { text, creatorAddress } = req.body ?? {};
    if (!text || !creatorAddress) {
      return res.status(400).json({ error: "text and creatorAddress are required" });
    }
    if (!ethers.isAddress(creatorAddress)) {
      return res.status(400).json({ error: "creatorAddress must be a valid Ethereum address" });
    }

    let contentId: string | null = null;
    // If the posted image resembles an already-registered image, this is its
    // probable root. Captured BEFORE the new content is written so the match
    // never "finds" the post's own freshly-registered copy.
    let probableRootContentId: string | null = null;
    let matchedSimilarity = 0;

    // Optional image — reuse the exact same pipeline as /content
    if (req.file) {
      contentId = generateContentId();

      const bestMatch = await findBestMatch(req.file.buffer);
      if (bestMatch) {
        probableRootContentId = bestMatch.contentId;
        matchedSimilarity = bestMatch.similarity;
      }

      const secret = generateSecret();
      const fingerprint = await computeDHash(req.file.buffer);
      const watermarkMessage = `modzero:${contentId}`;
      const watermarkedBuffer = await embedWatermark(req.file.buffer, watermarkMessage);

      const filename = `${contentId.slice(2, 18)}.png`;
      writeFileSync(path.join(UPLOADS_DIR, filename), watermarkedBuffer);
      const mediaUri = `/media/${filename}`;

      const commitment = generateCommitment({ secret, fingerprint, contentId, metadata: "" });
      const imageTxHash = await registerContentOnChain(contentId, commitment, null);

      saveContent({
        contentId,
        creatorAddress,
        ensName: null,
        parentContentId: null,
        mediaUri,
        fingerprint,
        fingerprintAlgorithm: "dHash-v1",
        watermarkIdentifier: watermarkMessage,
        commitment,
        createdAt: new Date().toISOString(),
        hederaSequence: null,
        ethereumTxHash: imageTxHash,
      });
    }

    // Server-enforced authorization (spec §24-25): publishing content that
    // matches an already-registered image requires a valid license, or a
    // claim is opened automatically. No moderator — the evidence pipeline
    // opens immediately so the stake consequence can settle deterministically.
    // This mirrors what Compose did client-side, but can no longer be
    // bypassed by calling the API directly.
    let claimId: string | null = null;
    if (contentId && probableRootContentId) {
      const hasValidLicense = await checkValidLicenseOnChain(probableRootContentId, creatorAddress);
      if (!hasValidLicense) {
        claimId = ethers.hexlify(ethers.randomBytes(32));
        const evidenceHash = ethers.keccak256(
          ethers.toUtf8Bytes(`${contentId}:${probableRootContentId}:${creatorAddress}`)
        );
        const claimTxHash = await createClaimOnChain(
          claimId,
          contentId,
          probableRootContentId,
          creatorAddress,
          evidenceHash
        );
        const onChainClaim = await getClaimOnChain(claimId);
        await publishHcsEvent({
          type: "CLAIM_CREATED",
          version: 1,
          claimId,
          contentId,
          rootContentId: probableRootContentId,
          claimant: onChainClaim.claimant,
          subject: creatorAddress,
          evidenceHash,
          timestamp: new Date().toISOString(),
        });
        console.warn(
          `[POST /post] auto-opened claim ${claimId} (sim=${matchedSimilarity.toFixed(3)}) ` +
            `against root ${probableRootContentId} for ${creatorAddress} (tx ${claimTxHash})`
        );
      }
    }

    const postId = ethers.hexlify(ethers.randomBytes(32));
    const textHash = ethers.keccak256(ethers.toUtf8Bytes(text));

    const ethereumTxHash = await createPostOnChain(postId, textHash, contentId);
    const hederaSequence = await publishHcsEvent({
      type: "POST_CREATED",
      version: 1,
      postId,
      creator: creatorAddress,
      textHash,
      contentId,
      timestamp: new Date().toISOString(),
    });

    const record = {
      postId,
      creatorAddress,
      text,
      textHash,
      contentId,
      createdAt: new Date().toISOString(),
      ethereumTxHash,
      hederaSequence,
    };


    savePost(record);
    res.status(201).json({ ...record, claimId });
  } catch (err) {
    console.error("[POST /post] failed:", err);
    res.status(500).json({ error: "failed to create post" });
  }
});

/**
 * GET /posts
 * Feed listing, ordered by recency, annotated with each creator's current
 * on-chain reputation (spec extension: challenge-based reputation).
 * Real "priority" ordering by reputation is a frontend/indexer concern —
 * this just exposes the raw data needed to compute it.
 */
router.get("/posts", async (req, res) => {
  try {
    const posts = listPosts();
    const withReputation = await Promise.all(
      posts.map(async (post) => ({
        ...post,
        creatorReputation: await getReputationOnChain(post.creatorAddress),
      }))
    );
    res.json(withReputation);
  } catch (err) {
    console.error("[GET /posts] failed:", err);
    res.status(500).json({ error: "failed to list posts" });
  }
});

router.get("/post/:id", async (req, res) => {
  const record = getPostById(req.params.id);
  if (record) return res.json(record);

  try {
    const onChainRecord = await getPostOnChain(req.params.id);
    if (!onChainRecord) return res.status(404).json({ error: "post not found" });
    res.json({ ...onChainRecord, text: null, _note: "on-chain fallback — text unavailable" });
  } catch (err) {
    res.status(404).json({ error: "post not found" });
  }
});

export default router;