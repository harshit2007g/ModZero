/**
 * Offline fixtures, in the REAL backend shapes (backend/src/routes/*.ts).
 *
 * The backend cannot start without .env — it constructs an ethers.Wallet and a
 * Hedera client at import time — so without keys there is nothing to talk to.
 * These fixtures let the UI be developed and demoed meanwhile. `client.ts` only
 * falls back to them when a request actually fails, and the shell shows a badge
 * whenever that happens, so nothing here can be mistaken for live data.
 */
import type { ChallengeRecord, ClaimRecord, ContentRecord, LicenseRecord, PostRecord } from "./api";

const hash = (seed: string) => {
  let h = 2166136261;
  let out = "";
  for (let i = 0; out.length < 64; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i;
    h = Math.imul(h, 16777619);
    out += (h >>> 0).toString(16).padStart(8, "0");
  }
  return `0x${out.slice(0, 64)}`;
};

/**
 * Sample artwork for the fixtures.
 *
 * Flat vector landscapes generated at build time into public/samples — they read
 * as something a person would actually post, rather than as placeholder noise,
 * and they carry no licensing baggage. Picked deterministically from the seed so
 * a given content ID always shows the same picture, and so a derivative (which
 * passes its parent's ID) shows the same picture as its original.
 */
const SAMPLE_COUNT = 12;

export function demoImage(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `/samples/sample-${(h % SAMPLE_COUNT) + 1}.png`;
}

const A = {
  alice: "0xA11CE0000000000000000000000000000000A11c",
  bob: "0xB0b0000000000000000000000000000000000B0B",
  carol: "0xCa401000000000000000000000000000000cA401",
  dev: "0xD3v0000000000000000000000000000000000D3v",
};

export const demoContent: Record<string, ContentRecord> = {
  "0xc0ffee01": {
    contentId: "0xc0ffee01",
    creatorAddress: A.alice,
    ensName: "alice.eth",
    parentContentId: null,
    mediaUri: demoImage("0xc0ffee01"),
    fingerprint: "9f2c4a71d0e83b56",
    fingerprintAlgorithm: "dHash-v1",
    watermarkIdentifier: "modzero:0xc0ffee01",
    commitment: hash("commit-c0ffee01"),
    createdAt: new Date(Date.now() - 864e5 * 3).toISOString(),
    hederaSequence: 101,
    ethereumTxHash: hash("tx-c0ffee01"),
    licenseStatus: "AVAILABLE",
    claimStatus: "NONE",
  },
  "0xc0ffee02": {
    contentId: "0xc0ffee02",
    creatorAddress: A.bob,
    ensName: "bob.eth",
    parentContentId: "0xc0ffee01",
    mediaUri: demoImage("0xc0ffee01"),
    fingerprint: "9f2c4a71d0e83b57",
    fingerprintAlgorithm: "dHash-v1",
    watermarkIdentifier: "modzero:0xc0ffee01",
    commitment: hash("commit-c0ffee02"),
    createdAt: new Date(Date.now() - 864e5 * 1.4).toISOString(),
    hederaSequence: 118,
    ethereumTxHash: hash("tx-c0ffee02"),
    licenseStatus: "LICENSED",
    claimStatus: "NONE",
  },
  "0xc0ffee03": {
    contentId: "0xc0ffee03",
    creatorAddress: A.carol,
    ensName: null,
    parentContentId: null,
    mediaUri: demoImage("0xc0ffee03"),
    fingerprint: "3d81ba05cc4e1177",
    fingerprintAlgorithm: "dHash-v1",
    watermarkIdentifier: "modzero:0xc0ffee03",
    commitment: hash("commit-c0ffee03"),
    createdAt: new Date(Date.now() - 3600e3 * 7).toISOString(),
    hederaSequence: 143,
    ethereumTxHash: hash("tx-c0ffee03"),
    licenseStatus: "AVAILABLE",
    claimStatus: "NONE",
  },
};

export const demoPosts: PostRecord[] = [
  {
    postId: "0xpost04",
    creatorAddress: A.dev,
    text: "shipped the watermark round-trip test today. survives a 70% jpeg re-encode and a 15% crop. the detector still finds it.",
    textHash: hash("t4"),
    contentId: null,
    createdAt: new Date(Date.now() - 3600e3 * 1).toISOString(),
    ethereumTxHash: hash("tx-post04"),
    hederaSequence: 171,
    creatorReputation: 12,
  },
  {
    postId: "0xpost03",
    creatorAddress: A.carol,
    text: "morning light on the studio wall. no filter, no edits.",
    textHash: hash("t3"),
    contentId: "0xc0ffee03",
    createdAt: new Date(Date.now() - 3600e3 * 7).toISOString(),
    ethereumTxHash: hash("tx-post03"),
    hederaSequence: 163,
    creatorReputation: 3,
  },
  {
    postId: "0xpost02",
    creatorAddress: A.bob,
    text: "licensed this from alice — commercial, 0.02 ETH, attribution kept. took about nine seconds.",
    textHash: hash("t2"),
    contentId: "0xc0ffee02",
    createdAt: new Date(Date.now() - 864e5 * 1.4).toISOString(),
    ethereumTxHash: hash("tx-post02"),
    hederaSequence: 118,
    creatorReputation: 7,
  },
  {
    postId: "0xpost01",
    creatorAddress: A.alice,
    text: "first one. fingerprinted, watermarked, timestamped before it ever hit the feed.",
    textHash: hash("t1"),
    contentId: "0xc0ffee01",
    createdAt: new Date(Date.now() - 864e5 * 3).toISOString(),
    ethereumTxHash: hash("tx-post01"),
    hederaSequence: 101,
    creatorReputation: 21,
  },
];

export const demoChallenges: Record<string, ChallengeRecord> = {
  "0xchal01": {
    challengeId: "0xchal01",
    postId: "0xpost03",
    challenger: A.alice,
    creator: A.carol,
    challengerStake: "500000000000000",
    votingDeadline: Math.floor(Date.now() / 1000) + 210,
    votesGuilty: 3,
    votesNotGuilty: 1,
    state: "VOTING",
  },
};

export const demoLicenses: Record<string, LicenseRecord> = {
  "0xlic01": {
    licenseId: "0xlic01",
    contentId: "0xc0ffee01",
    licensor: A.alice,
    licensee: A.bob,
    termsHash: hash("terms01"),
    issuedAt: new Date(Date.now() - 864e5 * 1.4).toISOString(),
    expiresAt: null,
    price: "0.02 ETH",
    currency: "ETH",
    terms: { commercial: true, modification: true, attribution: true },
    ethereumTxHash: hash("tx-lic01"),
  },
};

export const demoClaims: Record<string, ClaimRecord> = {
  "0xclaim01": {
    claimId: "0xclaim01",
    contentId: "0xc0ffee02",
    rootContentId: "0xc0ffee01",
    claimant: A.alice,
    subject: A.bob,
    evidenceHash: hash("ev01"),
    state: "OPEN",
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    ethereumTxHash: hash("tx-claim01"),
  },
};

export const demoVerifyMatch = {
  probableRootContentId: "0xc0ffee01",
  fingerprintMatch: true,
  fingerprintSimilarity: 0.96,
  detectedWatermark: "modzero:0xc0ffee01",
  watermarkMatch: true,
  hasValidLicense: false,
  recommendation: "CLAIM_ELIGIBLE" as const,
};

export const demoVerifyClear = {
  probableRootContentId: null,
  fingerprintMatch: false,
  fingerprintSimilarity: 0.21,
  detectedWatermark: null,
  watermarkMatch: false,
  hasValidLicense: false,
  recommendation: "NO_MATCH" as const,
};
