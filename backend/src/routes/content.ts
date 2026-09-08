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

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

/**
 * In-memory index. Real version uses backend/database (spec §31) — this
 * still counts as "the database is an index/cache" per spec, just not
 * persistent yet. Secrets are kept OUT of this map and never returned
 * over the API (spec §12: "do NOT store plaintext secrets on-chain" —
 * extended here to "never expose over the API" either).
 */
export const contentStore: Record<string, any> = {};
const secretStore: Record<string, string> = {};

/**
 * POST /content  (multipart/form-data, field name: "image")
 * Real pipeline per spec §8: fingerprint -> secret -> watermark -> embed
 * -> store off-chain -> commitment. Hedera publish + Ethereum stake are
 * still TODO (next steps) — hederaSequence/ethereumTxHash stay null
 * until those are wired in.
 */
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

    const filename = `${contentId.slice(2, 18)}.png`; // strip 0x, keep it short
    writeFileSync(path.join(UPLOADS_DIR, filename), watermarkedBuffer);
    const mediaUri = `/media/${filename}`;

    const commitment = generateCommitment({
      secret,
      fingerprint,
      contentId,
      metadata: ensName ?? "",
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
      hederaSequence: null, // TODO: publish CONTENT_CREATED (hedera/publisher)
      ethereumTxHash: null, // TODO: ContentRegistry.registerContent (contracts/)
      licenseStatus: "AVAILABLE",
      claimStatus: "NONE",
    };

    contentStore[contentId] = record;
    secretStore[contentId] = secret; // kept server-side only, never in the API response

    res.status(201).json(record);
  } catch (err) {
    console.error("[POST /content] failed:", err);
    res.status(500).json({ error: "failed to register content" });
  }
});

router.get("/content/:id", (req, res) => {
  const record = contentStore[req.params.id];
  if (!record) return res.status(404).json({ error: "content not found" });
  res.json(record);
});

/**
 * GET /content/:id/graph
 * Still mock — real version needs the Hedera indexer to actually exist
 * before there's provenance history to graph (spec §16-17). Next step.
 */
router.get("/content/:id/graph", (req, res) => {
  const rootId = req.params.id;
  res.json({
    rootContentId: rootId,
    nodes: [
      { contentId: rootId, creator: "unknown", licenseStatus: "AVAILABLE", claimStatus: "NONE" },
    ],
    edges: [],
  });
});

export default router;