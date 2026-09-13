import { Router } from "express";
import multer from "multer";
import { ethers } from "ethers";
import { detectWatermark } from "@modzero/watermark";
import { checkValidLicenseOnChain } from "../services/blockchain.js";
import { findBestMatch, SIMILARITY_THRESHOLD } from "../services/matcher.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post("/verify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "multipart field 'image' is required" });
    }

    const bestMatch = await findBestMatch(req.file.buffer);
    const detectedWatermark = bestMatch ? bestMatch.watermarkIdentifier : await detectWatermark(req.file.buffer);

    if (bestMatch) {
      const fingerprintMatch = bestMatch.similarity >= SIMILARITY_THRESHOLD;
      const watermarkMatch = detectedWatermark === bestMatch.watermarkIdentifier;

      const requester = (req.body?.requester as string) ?? ethers.ZeroAddress;
      const hasValidLicense = await checkValidLicenseOnChain(bestMatch.contentId, requester);

      return res.json({
        probableRootContentId: bestMatch.contentId,
        fingerprintMatch,
        fingerprintSimilarity: bestMatch.similarity,
        detectedWatermark,
        watermarkMatch,
        hasValidLicense,
        recommendation: fingerprintMatch || watermarkMatch ? "CLAIM_ELIGIBLE" : "NO_MATCH",
      });
    }

    res.json({
      probableRootContentId: null,
      fingerprintMatch: false,
      fingerprintSimilarity: 0,
      detectedWatermark,
      watermarkMatch: false,
      hasValidLicense: false,
      recommendation: "NO_MATCH",
    });
  } catch (err) {
    console.error("[POST /verify] failed:", err);
    res.status(500).json({ error: "verification failed" });
  }
});

export default router;