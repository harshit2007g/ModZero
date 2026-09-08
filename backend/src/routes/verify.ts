import { Router } from "express";
import multer from "multer";
import { ethers } from "ethers";
import { computeDHash, detectWatermark, similarity } from "@modzero/watermark";
import { checkValidLicenseOnChain } from "../services/blockchain.js";
import { db } from "../database/db.js";
import type { ContentRecord } from "../database/contentRepo.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const SIMILARITY_THRESHOLD = 0.85;

router.post("/verify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "multipart field 'image' is required" });
    }

    const submittedFingerprint = await computeDHash(req.file.buffer);
    const detectedWatermark = await detectWatermark(req.file.buffer);

    const allContent = db.prepare(`SELECT * FROM content`).all() as ContentRecord[];

    let bestMatch: { contentId: string; similarity: number; watermarkIdentifier: string } | null = null;

    for (const record of allContent) {
      if (!record.fingerprint || record.fingerprint.length !== 16) continue;

      let sim: number;
      try {
        sim = similarity(submittedFingerprint, record.fingerprint);
      } catch {
        continue;
      }

      if (!bestMatch || sim > bestMatch.similarity) {
        bestMatch = { contentId: record.contentId, similarity: sim, watermarkIdentifier: record.watermarkIdentifier };
      }
    }

    const watermarkMatch =
      detectedWatermark !== null && bestMatch !== null && bestMatch.watermarkIdentifier === detectedWatermark;

    const fingerprintMatch = bestMatch !== null && bestMatch.similarity >= SIMILARITY_THRESHOLD;

    const requester = (req.body?.requester as string) ?? ethers.ZeroAddress;
    const hasValidLicense = bestMatch ? await checkValidLicenseOnChain(bestMatch.contentId, requester) : false;

    res.json({
      probableRootContentId: bestMatch?.contentId ?? null,
      fingerprintMatch,
      fingerprintSimilarity: bestMatch?.similarity ?? 0,
      detectedWatermark,
      watermarkMatch,
      hasValidLicense,
      recommendation: fingerprintMatch || watermarkMatch ? "CLAIM_ELIGIBLE" : "NO_MATCH",
    });
  } catch (err) {
    console.error("[POST /verify] failed:", err);
    res.status(500).json({ error: "verification failed" });
  }
});

export default router;