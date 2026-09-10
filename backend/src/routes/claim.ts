import { Router } from "express";
import { ethers } from "ethers";
import { createClaimOnChain, getClaimOnChain, resolveClaimOnChain } from "../services/blockchain.js";
import { publishHcsEvent } from "../services/hedera.js";

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
    const hederaSequence = await publishHcsEvent({
      type: "CLAIM_CREATED",
      version: 1,
      claimId,
      contentId,
      rootContentId,
      claimant: onChainClaim.claimant,
      subject,
      evidenceHash: finalEvidenceHash,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      claimId,
      ...onChainClaim,
      ethereumTxHash,
      hederaSequence,
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
/**
 * POST /claim/:id/resolve
 * Body: { outcome: "VALID" | "INVALID" }
 * Permissionless in principle, but for demo purposes anyone can call this
 * directly rather than requiring a real arbitration mechanism (spec §26 —
 * explicitly allowed to be a simplified "protocol-enforced evidence
 * pipeline" for MVP, not full trustless arbitration).
 * On VALID, this triggers real on-chain stake slashing to the claimant.
 */
router.post("/claim/:id/resolve", async (req, res) => {
  try {
    const { outcome } = req.body ?? {};
    if (outcome !== "VALID" && outcome !== "INVALID") {
      return res.status(400).json({ error: "outcome must be VALID or INVALID" });
    }

    const ethereumTxHash = await resolveClaimOnChain(req.params.id, outcome);
    const onChainClaim = await getClaimOnChain(req.params.id);

    const hederaSequence = await publishHcsEvent({
      type: "CLAIM_RESOLVED",
      version: 1,
      claimId: req.params.id,
      outcome,
      timestamp: new Date().toISOString(),
    });

    res.json({ claimId: req.params.id, ...onChainClaim, ethereumTxHash, hederaSequence });
  } catch (err) {
    console.error("[POST /claim/:id/resolve] failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "failed to resolve claim" });
  }
});

export default router;