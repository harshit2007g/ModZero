import { Router } from "express";
import { ethers } from "ethers";
import { issueLicenseOnChain } from "../services/blockchain.js";
import { saveLicense, getLicenseById } from "../database/licenseRepo.js";
import { publishHcsEvent } from "../services/hedera.js";

const router = Router();

const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:4001";

router.post("/license/request", async (req, res) => {
  try {
    const { contentId, requester, usage, intendsModification, intendsPoliticalUse, licensor } = req.body ?? {};

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

    // TODO: verify x402 payment here before issuing (spec §20). Known gap.

    const licenseId = ethers.hexlify(ethers.randomBytes(32));
    const termsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(decision.terms)));
    const licensorAddress = licensor ?? "0x7fbc31df5d320D4dd7f877DDe5D880Aaf388E106";
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
      hederaSequence,
    };

    const { hederaSequence: _hs, ...dbRecord } = record;
    saveLicense(dbRecord);
    res.status(201).json({ ...record, terms: decision.terms });
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