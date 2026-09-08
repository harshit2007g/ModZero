import { Router } from "express";

const router = Router();

/**
 * Fake in-memory "database" so responses are at least self-consistent
 * across requests during frontend development. Replace with real
 * DB + indexer + contract reads per spec §30-31 in a later step.
 */
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

/**
 * POST /content
 * Registers new content. Real implementation: fingerprint + watermark
 * (watermark/), commitment (spec §12), Hedera CONTENT_CREATED event
 * (hedera/publisher), ContentRegistry.registerContent (contracts/).
 * For now: accepts the upload, returns a fake-but-shaped success response.
 */
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
    hederaSequence: null, // not yet published — real version awaits HCS confirmation
    ethereumTxHash: null, // not yet mined — real version awaits tx receipt
    licenseStatus: "AVAILABLE",
    claimStatus: "NONE",
  };

  mockContent[contentId] = fakeRecord;
  res.status(201).json(fakeRecord);
});

/**
 * GET /content/:id
 */
router.get("/content/:id", (req, res) => {
  const record = mockContent[req.params.id];
  if (!record) {
    return res.status(404).json({ error: "content not found" });
  }
  res.json(record);
});

/**
 * GET /content/:id/graph
 * Real implementation walks the indexer's provenance graph (spec §16-17).
 * Mock version returns a small fixed graph so frontend/graph work can
 * start immediately.
 */
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
