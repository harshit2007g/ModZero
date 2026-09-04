
import { Router } from "express";

const router = Router();

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
