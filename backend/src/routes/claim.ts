
import { Router } from "express";

const router = Router();

const mockClaims: Record<string, any> = {
  claim123: {
    claimId: "claim123",
    contentId: "charlie999",
    rootContentId: "abc123",
    claimant: "0xA11ce00000000000000000000000000000000A",
    subject: "0xChar11e0000000000000000000000000000000C",
    evidenceHash: "0xevidencehashclaim123",
    state: "RESOLVED_VALID",
    createdAt: "2026-09-03T09:00:00.000Z",
    resolvedAt: "2026-09-03T09:05:00.000Z",
    economicOutcome: {
      slashedStake: "0.001 ETH",
      recipient: "0xA11ce00000000000000000000000000000000A",
    },
  },
};

router.post("/claim", (req, res) => {
  const { contentId, rootContentId, subject } = req.body ?? {};
  const claimId = `mock-claim-${Date.now()}`;
  const fakeClaim = {
    claimId,
    contentId: contentId ?? "charlie999",
    rootContentId: rootContentId ?? "abc123",
    claimant: "0xA11ce00000000000000000000000000000000A",
    subject: subject ?? "0xMockSubject00000000000000000000000000",
    evidenceHash: `0xmockevidence${claimId}`,
    state: "CREATED",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    economicOutcome: null,
  };
  mockClaims[claimId] = fakeClaim;
  res.status(201).json(fakeClaim);
});

router.get("/claim/:id", (req, res) => {
  const record = mockClaims[req.params.id];
  if (!record) return res.status(404).json({ error: "claim not found" });
  res.json(record);
});

export default router;
