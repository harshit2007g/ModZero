import { Router } from "express";

const router = Router();

/**
 * POST /verify
 * Real implementation: run perceptual fingerprint + watermark detection
 * against the registry (watermark/detect/) to find a probable root
 * content match (spec §23). Mock version always "finds" a match against
 * abc123 so the claim-flow UI has something to build against.
 */
router.post("/verify", (req, res) => {
  const { mediaUri } = req.body ?? {};

  res.json({
    submittedMediaUri: mediaUri ?? null,
    probableRootContentId: "abc123",
    fingerprintMatch: true,
    fingerprintSimilarity: 0.94,
    watermarkMatch: true,
    hasValidLicense: false,
    recommendation: "CLAIM_ELIGIBLE",
  });
});

export default router;
