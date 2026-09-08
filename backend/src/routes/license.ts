import { Router } from "express";
import { ethers } from "ethers";
import { issueLicenseOnChain } from "../services/blockchain.js";

const router = Router();

const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:4001";

const mockLicenses: Record<string, any> = {}; // still used as a local index/cache (spec §31)

/**
 * POST /license/request
 * Real flow per spec §19-21:
 *  1. Forward the request to the creator agent for policy evaluation
 *  2. If APPROVE, issue the license on-chain via LicenseRegistry
 * NOTE: x402 payment verification is still a TODO — for now this issues
 * the license immediately on APPROVE without a real payment step, which
 * is a known gap to close before demo (spec §20 requires payment be
 * independently verified first).
 *
 * Body: { contentId, requester, usage, intendsModification?, intendsPoliticalUse?, licensor }
 */
router.post("/license/request", async (req, res) => {
  try {
    const { contentId, requester, usage, intendsModification, intendsPoliticalUse, licensor } = req.body ?? {};

    if (!contentId || !requester || !usage) {
      return res.status(400).json({ error: "contentId, requester, and usage are required" });
    }
    if (!ethers.isAddress(requester)) {
      return res.status(400).json({ error: "requester must be a valid Ethereum address" });
    }

    // Step 1 — ask the creator agent to evaluate against its policy
    const agentResponse = await fetch(`${AGENT_URL}/license/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentId,
        requester,
        usage,
        intendsModification: !!intendsModification,
        intendsPoliticalUse: !!intendsPoliticalUse,
      }),
    });

    if (!agentResponse.ok) {
      return res.status(502).json({ error: "creator agent unavailable" });
    }

    const decision = await agentResponse.json();

    if (decision.decision !== "APPROVE") {
      return res.status(403).json({ decision: "REJECT", reason: decision.reason });
    }

    // Step 2 — TODO: verify x402 payment here before issuing (spec §20).
    // Skipped for now — known gap, must be closed before demo.

    const licenseId = ethers.hexlify(ethers.randomBytes(32));
    const termsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(decision.terms)));
    const licensorAddress = licensor ?? "0x7fbc31df5d320D4dd7f877DDe5D880Aaf388E106"; // TODO: derive from content's registered creator
    const expiresAt = 0; // no expiry for MVP

    const ethereumTxHash = await issueLicenseOnChain(
      licenseId,
      contentId,
      licensorAddress,
      requester,
      termsHash,
      expiresAt
    );

    const record = {
      licenseId,
      contentId,
      licensor: licensorAddress,
      licensee: requester,
      termsHash,
      issuedAt: new Date().toISOString(),
      expiresAt: null,
      price: decision.price,
      currency: decision.currency,
      terms: decision.terms,
      ethereumTxHash,
    };

    mockLicenses[licenseId] = record;
    res.status(201).json(record);
  } catch (err) {
    console.error("[POST /license/request] failed:", err);
    res.status(500).json({ error: "failed to process license request" });
  }
});

router.get("/license/:id", (req, res) => {
  const record = mockLicenses[req.params.id];
  if (!record) return res.status(404).json({ error: "license not found" });
  res.json(record);
});

export default router;