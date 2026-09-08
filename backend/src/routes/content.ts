import { Router } from "express";
import multer from "multer";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  computeDHash,
  embedWatermark,
  generateSecret,
  generateContentId,
  generateCommitment,
} from "@modzero/watermark";
import { registerContentOnChain, getContentOnChain } from "../services/blockchain.js";
import { saveContent, getContentById } from "../database/contentRepo.js";
import { publishHcsEvent } from "../services/hedera.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

// Secrets are kept OUT of the database response paths and never returned
// over the API (spec §12).
const secretStore: Record<string, string> = {};

router.post("/content", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "multipart field 'image' is required" });
    }
    const { ensName, creatorAddress, parentContentId } = req.body ?? {};

    const contentId = generateContentId();
    const secret = generateSecret();

    const fingerprint = await computeDHash(req.file.buffer);
    const watermarkMessage = `modzero:${contentId}`;
    const watermarkedBuffer = await embedWatermark(req.file.buffer, watermarkMessage);

    const filename = `${contentId.slice(2, 18)}.png`;
    writeFileSync(path.join(UPLOADS_DIR, filename), watermarkedBuffer);
    const mediaUri = `/media/${filename}`;

    const commitment = generateCommitment({
      secret,
      fingerprint,
      contentId,
      metadata: ensName ?? "",
    });

    const ethereumTxHash = await registerContentOnChain(contentId, commitment, parentContentId ?? null);
    const hederaSequence = await publishHcsEvent({
  type: "CONTENT_CREATED",
  version: 1,
  contentId,
  creator: creatorAddress ?? "0xUnknownCreator0000000000000000000000000",
  ens: ensName ?? "",
  fingerprintCommitment: commitment,
  mediaUri,
  timestamp: new Date().toISOString(),
});

    const record = {
      contentId,
      creatorAddress: creatorAddress ?? "0xUnknownCreator0000000000000000000000000",
      ensName: ensName ?? null,
      parentContentId: parentContentId ?? null,
      mediaUri,
      fingerprint,
      fingerprintAlgorithm: "dHash-v1",
      watermarkIdentifier: watermarkMessage,
      commitment,
      createdAt: new Date().toISOString(),
      hederaSequence,
      ethereumTxHash,
    };

    saveContent(record);
    secretStore[contentId] = secret;

    res.status(201).json({ ...record, licenseStatus: "AVAILABLE", claimStatus: "NONE" });
  } catch (err) {
    console.error("[POST /content] failed:", err);
    res.status(500).json({ error: "failed to register content on-chain" });
  }
});

router.get("/content/:id", async (req, res) => {
  const dbRecord = getContentById(req.params.id);
  if (dbRecord) {
    return res.json({ ...dbRecord, licenseStatus: "AVAILABLE", claimStatus: "NONE" });
  }

  // Fallback: not in our DB (e.g. registered from a different machine/session
  // before persistence existed) — read the chain directly for at least the
  // economically-relevant fields.
  try {
    const onChainRecord = await getContentOnChain(req.params.id);
    if (!onChainRecord) return res.status(404).json({ error: "content not found" });

    res.json({
      ...onChainRecord,
      ensName: null,
      mediaUri: null,
      fingerprint: null,
      fingerprintAlgorithm: null,
      watermarkIdentifier: null,
      hederaSequence: null,
      ethereumTxHash: null,
      licenseStatus: "UNKNOWN",
      claimStatus: "UNKNOWN",
      _note: "Read from on-chain fallback — this content predates local DB persistence",
    });
  } catch (err) {
    console.error("[GET /content/:id] on-chain fallback failed:", err);
    res.status(404).json({ error: "content not found" });
  }
});

router.get("/content/:id/graph", (req, res) => {
  const rootId = req.params.id;
  res.json({
    rootContentId: rootId,
    nodes: [{ contentId: rootId, creator: "unknown", licenseStatus: "AVAILABLE", claimStatus: "NONE" }],
    edges: [],
  });
});

export default router;