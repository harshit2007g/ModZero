import { Router } from "express";
import multer from "multer";
import { computeDHash, detectWatermark, similarity } from "@modzero/watermark";
import { contentStore } from "./content.js";
import { checkValidLicenseOnChain } from "../services/blockchain.js";
import { ethers } from "ethers";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const SIMILARITY_THRESHOLD = 0.85; // blunt MVP rule per spec §17 — tune later

/**
 * POST /verify  (multipart/form-data, field name: "image")
 * Real implementation per spec §23: compute fingerprint + detect
 * watermark on the submitted image, compare against every registered
 * content record, and report the strongest match.
 */
router.post("/verify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "multipart field 'image' is required" });
    }

    const submittedFingerprint = await computeDHash(req.file.buffer);
    const detectedWatermark = await detectWatermark(req.file.buffer);

    let bestMatch: { contentId: string; similarity: number } | null = null;

    for (const record of Object.values(contentStore) as any[]) {
      if (!record.fingerprint || typeof record.fingerprint !== "string") continue;
      if (record.fingerprint.length !== 16) continue; // skip malformed/legacy entries, not a real dHash

      let sim: number;
      try {
        sim = similarity(submittedFingerprint, record.fingerprint);
      } catch {
        continue;
      }

      if (!bestMatch || sim > bestMatch.similarity) {
        bestMatch = { contentId: record.contentId, similarity: sim };
      }
    }

    const watermarkMatch =
      detectedWatermark !== null &&
      bestMatch !== null &&
      contentStore[bestMatch.contentId]?.watermarkIdentifier === detectedWatermark;

    const fingerprintMatch = bestMatch !== null && bestMatch.similarity >= SIMILARITY_THRESHOLD;

    // hasValidLicense check needs LicenseRegistry wired up — TODO, defaults
    // to false so this never falsely clears someone (spec §27 caution).
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