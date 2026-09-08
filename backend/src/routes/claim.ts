import { Router } from "express";
import { ethers } from "ethers";
import { createClaimOnChain, getClaimOnChain } from "../services/blockchain.js";

const router = Router();

/**
 * POST /claim
 * Real implementation: creates an on-chain claim via ClaimRegistry.
 * Per spec §26-28, this alone does NOT prove anything or automatically
 * settle — it opens the evidence pipeline. Resolution (slashing, etc.)
 * is a separate, deliberately not-yet-automated step.
 *
 * Body: { contentId, rootContentId, subject, evidenceHash? }
 * evidenceHash should ideally come from a real /verify result — if not
 * provided, we hash the raw inputs as a fallback so the call doesn't fail,
 * but real evidence should always be passed in from a prior /verify call.
 */
router.post("/claim", async (req, res) => {
  try {
    const { contentId, rootContentId, subject, evidenceHash } = req.body ?? {};

    if (!contentId || !rootContentId || !subject) {
      return res.status(400).json({ error: "contentId, rootContentId, and subject are required" });
    }
    if (!ethers.isAddress(subject)) {
      return res.status(400).json({ error: "subject must be a valid Ethereum address" });
    }

    const claimId = ethers.hexlify(ethers.randomBytes(32));
    const finalEvidenceHash =
      evidenceHash ?? ethers.keccak256(ethers.toUtf8Bytes(`${contentId}:${rootContentId}:${subject}`));

    const ethereumTxHash = await createClaimOnChain(claimId, contentId, rootContentId, subject, finalEvidenceHash);
    const onChainClaim = await getClaimOnChain(claimId);

    res.status(201).json({
      claimId,
      ...onChainClaim,
      ethereumTxHash,
    });
  } catch (err) {
    console.error("[POST /claim] failed:", err);
    res.status(500).json({ error: "failed to create claim on-chain" });
  }
});

/**
 * GET /claim/:id
 * Reads claim state directly from ClaimRegistry — always reflects the
 * real current on-chain state, not a cached copy.
 */
router.get("/claim/:id", async (req, res) => {
  try {
    const onChainClaim = await getClaimOnChain(req.params.id);
    if (onChainClaim.state === "NONE") {
      return res.status(404).json({ error: "claim not found" });
    }
    res.json({ claimId: req.params.id, ...onChainClaim });
  } catch (err) {
    console.error("[GET /claim/:id] failed:", err);
    res.status(500).json({ error: "failed to read claim" });
  }
});

export default router;