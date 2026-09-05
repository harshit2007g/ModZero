import { Router } from "express";
const router = Router();

const mockLicenses: Record<string, any> = {
  license123: {
    licenseId: "license123",
    contentId: "abc123",
    creator: "0xA11ce00000000000000000000000000000000A",
    licensee: "0xB0b0000000000000000000000000000000000B",
    termsHash: "0xtermshashlicense123",
    issuedAt: "2026-09-02T14:31:00.000Z",
    expiresAt: null,
    paymentReference: "x402:mockref123",
  },
};

/**
 * POST /license/request
 * Real implementation forwards to the creator agent's /license/evaluate
 * (agent/), then on APPROVE drives the x402 payment flow and finally
 * calls LicenseRegistry.issueLicense (contracts/). Mock version always
 * approves so frontend can build the full happy-path UI now.
 */
router.post("/license/request", (req, res) => {
  const { contentId, requester, usage } = req.body ?? {};

  const licenseId = `mock-license-${Date.now()}`;
  const fakeLicense = {
    licenseId,
    contentId: contentId ?? "abc123",
    creator: "0xA11ce00000000000000000000000000000000A",
    licensee: requester ?? "0xMockRequester0000000000000000000000000",
    termsHash: `0xmocktermshash${licenseId}`,
    issuedAt: new Date().toISOString(),
    expiresAt: null,
    paymentReference: null, // real version fills this in once x402 payment is verified
    decision: "APPROVE",
    price: usage === "commercial" ? "0.02 ETH" : "0.002 ETH",
    currency: "ETH",
  };

  mockLicenses[licenseId] = fakeLicense;
  res.status(201).json(fakeLicense);
});

/**
 * GET /license/:id
 */
router.get("/license/:id", (req, res) => {
  const record = mockLicenses[req.params.id];
  if (!record) {
    return res.status(404).json({ error: "license not found" });
  }
  res.json(record);
});

export default router;
