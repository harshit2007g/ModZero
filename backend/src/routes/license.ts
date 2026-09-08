
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
    paymentReference: null,
    decision: "APPROVE",
    price: usage === "commercial" ? "0.02 ETH" : "0.002 ETH",
    currency: "ETH",
  };
  mockLicenses[licenseId] = fakeLicense;
  res.status(201).json(fakeLicense);
});

router.get("/license/:id", (req, res) => {
  const record = mockLicenses[req.params.id];
  if (!record) return res.status(404).json({ error: "license not found" });
  res.json(record);
});

export default router;
