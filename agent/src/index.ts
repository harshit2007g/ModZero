import express from "express";
import dotenv from "dotenv";
import policy from "./policy/example-policy.json" with { type: "json" };
import { evaluateLicenseRequest, type LicenseRequest } from "./policy/types.js";

dotenv.config({ path: "../.env" });

const app = express();
app.use(express.json());

const PORT = process.env.AGENT_PORT || 4001;

app.get("/health", (_req, res) => res.json({ ok: true, service: "modzero-creator-agent" }));

app.get("/policy", (_req, res) => res.json(policy));

/**
 * POST /license/evaluate
 * Body: LicenseRequest
 * Returns a structured decision (spec §19). Payment (x402) and on-chain
 * license issuance happen in a follow-up step once APPROVE is returned —
 * this endpoint does not move money by itself.
 */
app.post("/license/evaluate", (req, res) => {
  const request = req.body as LicenseRequest;
  const decision = evaluateLicenseRequest(policy as any, request);
  res.json(decision);
});

// TODO: x402 payment-required flow wraps around the APPROVE path here —
// see agent/x402/ once implemented.

app.listen(PORT, () => {
  console.log(`[modzero-agent] listening on :${PORT}`);
});
