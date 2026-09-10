import { Router } from "express";
import { ethers } from "ethers";
import { issueLicenseOnChain, verifyPaymentOnChain } from "../services/blockchain.js";
import { publishHcsEvent } from "../services/hedera.js";
import { saveLicense, getLicenseById } from "../database/licenseRepo.js";

const router = Router();

const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:4001";

/**
 * POST /license/request
 * Two-step minimal x402-style flow (spec §20):
 *
 * Step 1 — no paymentTxHash provided: agent evaluates the request. If
 * APPROVE, responds with HTTP 402 Payment Required and payment
 * instructions (payTo, amountWei). No license is issued yet.
 *
 * Step 2 — same request, now WITH paymentTxHash: backend independently
 * verifies that transaction on Sepolia actually satisfies the terms
 * (right recipient, right sender, right amount, confirmed) before issuing
 * the license on-chain. A client claiming "I paid" is never trusted alone.
 *
 * Body: { contentId, requester, usage, intendsModification?, intendsPoliticalUse?, licensor?, paymentTxHash? }
 */
router.post("/license/request", async (req, res) => {
  try {
    const { contentId, requester, usage, intendsModification, intendsPoliticalUse, licensor, paymentTxHash } =
      req.body ?? {};

    if (!contentId || !requester || !usage) {
      return res.status(400).json({ error: "contentId, requester, and usage are required" });
    }
    if (!ethers.isAddress(requester)) {
      return res.status(400).json({ error: "requester must be a valid Ethereum address" });
    }

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

    const licensorAddress = licensor ?? "0x7fbc31df5d320D4dd7f877DDe5D880Aaf388E106";
    const priceWei = ethers.parseEther(String(decision.price).replace(" ETH", ""));

    // Step 1: no payment yet — tell the client what to pay and to whom.
    if (!paymentTxHash) {
      return res.status(402).json({
        error: "payment required",
        payTo: licensorAddress,
        amountWei: priceWei.toString(),
        amount: decision.price,
        currency: decision.currency,
        instructions:
          "Send a transaction to `payTo` for at least `amountWei`, then resend this request including `paymentTxHash`.",
      });
    }

    // Step 2: payment claimed — verify it independently before issuing.
    const verification = await verifyPaymentOnChain(paymentTxHash, licensorAddress, requester, priceWei);
    if (!verification.valid) {
      return res.status(402).json({ error: "payment verification failed", reason: verification.reason });
    }

    const licenseId = ethers.hexlify(ethers.randomBytes(32));
    const termsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(decision.terms)));
    const expiresAt = 0;

    const ethereumTxHash = await issueLicenseOnChain(
      licenseId,
      contentId,
      licensorAddress,
      requester,
      termsHash,
      expiresAt
    );

    const hederaSequence = await publishHcsEvent({
      type: "LICENSE_CREATED",
      version: 1,
      contentId,
      licenseId,
      licensor: licensorAddress,
      licensee: requester,
      termsHash,
      timestamp: new Date().toISOString(),
    });

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
      termsJson: JSON.stringify(decision.terms),
      ethereumTxHash,
    };

    saveLicense(record);
    res.status(201).json({ ...record, terms: decision.terms, hederaSequence, paymentTxHash });
  } catch (err) {
    console.error("[POST /license/request] failed:", err);
    res.status(500).json({ error: "failed to process license request" });
  }
});

router.get("/license/:id", (req, res) => {
  const record = getLicenseById(req.params.id);
  if (!record) return res.status(404).json({ error: "license not found" });
  res.json({ ...record, terms: JSON.parse(record.termsJson) });
});

export default router;