
import { Router } from "express";

const router = Router();

const mockContent: Record<string, any> = {
  abc123: {
    contentId: "abc123",
    creatorAddress: "0xA11ce00000000000000000000000000000000A",
    ensName: "alice.eth",
    parentContentId: null,
    mediaUri: "ipfs://bafybeigdyrmock-alice-original",
    fingerprint: "phash:9f3a1c...",
    fingerprintAlgorithm: "pHash-v1",
    watermarkIdentifier: "wm:abc123-alice",
    commitment: "0xcommitmentabc123",
    createdAt: "2026-09-01T10:00:00.000Z",
    hederaSequence: 101,
    ethereumTxHash: "0xdeadbeef00000000000000000000000000000000000000000000000000aa",
    licenseStatus: "AVAILABLE",
    claimStatus: "NONE",
  },
  child123: {
    contentId: "child123",
    creatorAddress: "0xB0b0000000000000000000000000000000000B",
    ensName: "bob.eth",
    parentContentId: "abc123",
    mediaUri: "ipfs://bafybeigdyrmock-bob-derivative",
    fingerprint: "phash:9f3a2d...",
    fingerprintAlgorithm: "pHash-v1",
    watermarkIdentifier: "wm:abc123-alice",
    commitment: "0xcommitmentchild123",
    createdAt: "2026-09-02T14:30:00.000Z",
    hederaSequence: 104,
    ethereumTxHash: "0xdeadbeef00000000000000000000000000000000000000000000000000bb",
    licenseStatus: "LICENSED",
    claimStatus: "NONE",
  },
};

router.post("/content", (req, res) => {
  const { ensName, mediaUri } = req.body ?? {};
  const contentId = `mock-${Date.now()}`;
  const fakeRecord = {
    contentId,
    creatorAddress: "0xMockCreatorAddress0000000000000000000000",
    ensName: ensName ?? "unknown.eth",
    parentContentId: null,
    mediaUri: mediaUri ?? "ipfs://mock-uri",
    fingerprint: "phash:mockfingerprint",
    fingerprintAlgorithm: "pHash-v1",
    watermarkIdentifier: `wm:${contentId}`,
    commitment: `0xmockcommitment${contentId}`,
    createdAt: new Date().toISOString(),
    hederaSequence: null,
    ethereumTxHash: null,
    licenseStatus: "AVAILABLE",
    claimStatus: "NONE",
  };
  mockContent[contentId] = fakeRecord;
  res.status(201).json(fakeRecord);
});

router.get("/content/:id", (req, res) => {
  const record = mockContent[req.params.id];
  if (!record) return res.status(404).json({ error: "content not found" });
  res.json(record);
});

router.get("/content/:id/graph", (req, res) => {
  const rootId = req.params.id;
  res.json({
    rootContentId: rootId,
    nodes: [
      { contentId: "abc123", creator: "alice.eth", licenseStatus: "AVAILABLE", claimStatus: "NONE" },
      { contentId: "child123", creator: "bob.eth", licenseStatus: "LICENSED", claimStatus: "NONE" },
      { contentId: "charlie999", creator: "charlie.eth", licenseStatus: "NONE", claimStatus: "UNAUTHORIZED" },
    ],
    edges: [
      { from: "abc123", to: "child123", relationship: "LICENSED" },
      { from: "abc123", to: "charlie999", relationship: "UNAUTHORIZED" },
    ],
  });
});

export default router;
