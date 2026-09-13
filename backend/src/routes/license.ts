import { Router } from "express";
import { ethers } from "ethers";
import {
  getNetworkChainId,
  issueLicenseOnChain,
  verifyPaymentOnChain,
  LICENSOR_ADDRESS,
  licenseBindingData,
} from "../services/blockchain.js";
import { publishHcsEvent } from "../services/hedera.js";
import {
  saveLicense,
  getLicenseById,
  getLicenseByPaymentTxHash,
  getLicenseByContentAndLicensee,
  savePaymentUsed,
} from "../database/licenseRepo.js";

const router = Router();

const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:4001";
const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

/**
 * Serializes step-2 handling per payment hash. Two concurrent requests
 * carrying the same paymentTxHash (double-click, tab refresh, retry) must
 * NEVER mint two licenses for one payment — the second one waits for the
 * first to finish, then finds the license via used_payment and returns it.
 * Single backend process, so an in-process map is sufficient.
 */
const inFlight: Record<string, Promise<unknown>> = {};

function serialized<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = inFlight[key] ?? Promise.resolve();
  const run = prev.then(fn, fn);
  inFlight[key] = run.then(
    () => {
      delete inFlight[key];
    },
    () => {
      delete inFlight[key];
    }
  );
  return run;
}

function networkName(chainId: number): string {
  return chainId === 11155111 ? "sepolia" : chainId === 1 ? "mainnet" : `chain-${chainId}`;
}

type LicenseRow = {
  licenseId: string;
  contentId: string;
  licensor: string;
  licensee: string;
  termsHash: string;
  issuedAt: string;
  expiresAt: string | null;
  price: string;
  currency: string;
  termsJson: string;
  ethereumTxHash: string;
};

function withTerms(row: LicenseRow) {
  return { ...row, terms: JSON.parse(row.termsJson) };
}

/**
 * POST /license/request
 * Two-step minimal x402-style flow (spec §20):
 *
 * Step 1 — no paymentTxHash provided: agent evaluates the request. If
 * APPROVE, responds with HTTP 402 Payment Required and payment
 * instructions (payTo, amountWei, chainId, network). No license is issued
 * yet.
 *
 * Step 2 — same request, now WITH paymentTxHash: backend independently
 * verifies that transaction on the expected chain actually satisfies the
 * terms (right recipient, right sender, right amount, bound to THIS content
 * request, confirmed) before issuing the license on-chain. A client
 * claiming "I paid" is never trusted alone, and a payment transaction is
 * never used for a second license.
 *
 * Idempotent at every stage: an already-licensed requester, or a
 * re-submitted payment, returns the existing license (200) instead of
 * charging again or minting a duplicate.
 *
 * Body: { contentId, requester, usage, intendsModification?, intendsPoliticalUse?, paymentTxHash? }
 */
router.post("/license/request", async (req, res) => {
  try {
    const { contentId, requester, usage, intendsModification, intendsPoliticalUse, paymentTxHash } = req.body ?? {};

    if (!contentId || !requester || !usage) {
      return res.status(400).json({ error: "contentId, requester, and usage are required" });
    }
    if (!ethers.isAddress(requester)) {
      return res.status(400).json({ error: "requester must be a valid Ethereum address" });
    }
    if (paymentTxHash !== undefined && !TX_HASH_RE.test(paymentTxHash)) {
      return res.status(400).json({ error: "paymentTxHash must be a 0x transaction hash (64 hex chars)" });
    }

    // Already holds a license for this content → give it back instead of
    // asking for another payment (refresh / revisit / duplicate publish).
    const existing = getLicenseByContentAndLicensee(contentId, requester);
    if (existing) {
      return res.json({ ...withTerms(existing), alreadyLicensed: true });
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

    // The backend relay is the only principal that receives payments and
    // records licenses (LicenseRegistry now requires msg.sender == licensor).
    const licensorAddress = LICENSOR_ADDRESS;
    const priceWei = ethers.parseEther(String(decision.price).replace(" ETH", ""));
    const chainId = await getNetworkChainId();
    const paymentIntentData = licenseBindingData(contentId, requester);

    // Step 1: no payment yet — tell the client what to pay, to whom, where,
    // and with what content bound into the transfer.
    if (!paymentTxHash) {
      return res.status(402).json({
        error: "payment required",
        payTo: licensorAddress,
        amountWei: priceWei.toString(),
        amount: decision.price,
        currency: decision.currency,
        instructions: "Pay from your wallet; your client then sends this request again with the paymentTxHash.",
        contentId,
        chainId,
        network: networkName(chainId),
        paymentIntentData,
      });
    }

    // Step 2: payment claimed — verify it independently, then issue.
    const result = await serialized(paymentTxHash, async () => {
      const reused = getLicenseByPaymentTxHash(paymentTxHash);
      if (reused) {
        // A payment is bound to exactly one content request; handing out a
        // different content's license would silently imply the wrong grant.
        if (reused.contentId.toLowerCase() !== contentId.toLowerCase()) {
          return { status: "failed" as const, reason: "this payment was already used for a different content" };
        }
        return { status: "already_issued" as const, license: reused };
      }

      const verification = await verifyPaymentOnChain(paymentTxHash, licensorAddress, requester, priceWei, {
        chainId,
        minConfirmations: 1,
        expectedData: paymentIntentData,
      });
      if (!verification.valid) {
        return { status: "failed" as const, reason: verification.reason ?? "unknown" };
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
      savePaymentUsed(paymentTxHash, licenseId);
      return { status: "issued" as const, record, hederaSequence };
    });

    if (result.status === "already_issued") {
      return res.json({ ...withTerms(result.license), alreadyIssued: true });
    }
    if (result.status === "failed") {
      return res.status(402).json({
        error: "payment verification failed",
        reason: result.reason,
        payTo: licensorAddress,
        amountWei: priceWei.toString(),
        amount: decision.price,
        currency: decision.currency,
        contentId,
        chainId,
        network: networkName(chainId),
        paymentIntentData,
      });
    }
    res.status(201).json({ ...withTerms(result.record), hederaSequence: result.hederaSequence, paymentTxHash });
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