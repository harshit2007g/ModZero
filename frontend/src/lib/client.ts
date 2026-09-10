/**
 * Thin wrapper over lib/api.ts.
 *
 * api.ts is the team's file and matches the backend exactly — it is not
 * modified here. This adds one thing: if the backend is unreachable (no .env,
 * so it cannot boot), calls fall back to fixtures and `offline` flips to true
 * so the shell can say so. Every response shape is identical either way.
 */
import * as api from "./api";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";
import type { ChallengeRecord, ClaimRecord, ContentRecord, LicenseRecord, PostRecord } from "./api";
import {
  demoChallenges,
  demoClaims,
  demoContent,
  demoImage,
  demoLicenses,
  demoPosts,
  demoVerifyClear,
  demoVerifyMatch,
} from "./demo";

let offline = false;
const listeners = new Set<(v: boolean) => void>();

export function isOffline() {
  return offline;
}
export function onOfflineChange(fn: (v: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function markOffline() {
  if (!offline) {
    offline = true;
    listeners.forEach((fn) => fn(true));
  }
}

/**
 * One health probe decides for the whole session.
 *
 * Without this, every call fires its own doomed request and the console fills
 * with ERR_CONNECTION_REFUSED — one line per fetch, which JavaScript cannot
 * suppress. Probing once and remembering the answer keeps it to a single entry.
 */
let probe: Promise<boolean> | null = null;

function backendReachable(): Promise<boolean> {
  probe ??= fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2500) })
    .then((r) => r.ok)
    .catch(() => false);
  return probe;
}

async function fallback<T>(run: () => Promise<T>, demo: () => T): Promise<T> {
  if (!(await backendReachable())) {
    markOffline();
    await new Promise((r) => setTimeout(r, 200));
    return demo();
  }
  try {
    return await run();
  } catch {
    markOffline();
    await new Promise((r) => setTimeout(r, 200));
    return demo();
  }
}

/** Local additions so the demo feed keeps anything posted this session. */
const localPosts: PostRecord[] = [];
const localContent: Record<string, ContentRecord> = {};

export const listPosts = () =>
  fallback(api.listPosts, () => [...localPosts, ...demoPosts]);

export const getPost = (id: string) =>
  fallback(
    () => api.getPost(id),
    () => {
      const found = [...localPosts, ...demoPosts].find((p) => p.postId === id);
      if (!found) throw new Error("post not found");
      return found;
    },
  );

export const createPost = (text: string, creatorAddress: string, image?: File) =>
  fallback(
    () => api.createPost(text, creatorAddress, image),
    () => {
      const postId = `0xlocal${Date.now().toString(16)}`;
      const contentId = image ? `0xlocalc${Date.now().toString(16)}` : null;
      if (contentId) {
        localContent[contentId] = {
          contentId,
          creatorAddress,
          ensName: null,
          parentContentId: null,
          mediaUri: URL.createObjectURL(image as File),
          fingerprint: Math.random().toString(16).slice(2, 18),
          fingerprintAlgorithm: "dHash-v1",
          watermarkIdentifier: `modzero:${contentId}`,
          commitment: `0x${Math.random().toString(16).slice(2).padEnd(64, "0").slice(0, 64)}`,
          createdAt: new Date().toISOString(),
          hederaSequence: 200 + localPosts.length,
          ethereumTxHash: `0x${Math.random().toString(16).slice(2).padEnd(64, "0").slice(0, 64)}`,
          licenseStatus: "AVAILABLE",
          claimStatus: "NONE",
        };
      }
      const record: PostRecord = {
        postId,
        creatorAddress,
        text,
        textHash: `0x${Math.random().toString(16).slice(2, 18)}`,
        contentId,
        createdAt: new Date().toISOString(),
        ethereumTxHash: `0x${Math.random().toString(16).slice(2, 18)}`,
        hederaSequence: 200 + localPosts.length,
        creatorReputation: 0,
      };
      localPosts.unshift(record);
      return record;
    },
  );

export const getContent = (id: string) =>
  fallback(
    () => api.getContent(id),
    () => {
      const found = localContent[id] ?? demoContent[id];
      if (!found) throw new Error("content not found");
      return found;
    },
  );

export const getContentGraph = (id: string) =>
  fallback(
    () => api.getContentGraph(id),
    () => ({
      rootContentId: id,
      nodes: [{ contentId: id, creator: "unknown", licenseStatus: "AVAILABLE", claimStatus: "NONE" }],
      edges: [] as unknown[],
    }),
  );

export const verifyContent = (file: File, requester: string) =>
  fallback(
    () => api.verifyContent(file, requester),
    () => (file.size % 2 === 0 ? demoVerifyMatch : demoVerifyClear),
  );

export const requestLicense = (input: Parameters<typeof api.requestLicense>[0]) =>
  fallback(
    () => api.requestLicense(input),
    () => {
      const id = `0xlic${Date.now().toString(16)}`;
      const record: LicenseRecord = {
        licenseId: id,
        contentId: input.contentId,
        licensor: demoContent[input.contentId]?.creatorAddress ?? "0x0",
        licensee: input.requester,
        termsHash: `0x${Math.random().toString(16).slice(2, 18)}`,
        issuedAt: new Date().toISOString(),
        expiresAt: null,
        price: input.usage === "commercial" ? "0.02 ETH" : "0.002 ETH",
        currency: "ETH",
        terms: {
          commercial: input.usage === "commercial",
          modification: !!input.intendsModification,
          attribution: true,
        },
        ethereumTxHash: `0x${Math.random().toString(16).slice(2, 18)}`,
      };
      demoLicenses[id] = record;
      return record;
    },
  );

export const getLicense = (id: string) =>
  fallback(
    () => api.getLicense(id),
    () => {
      const found = demoLicenses[id];
      if (!found) throw new Error("license not found");
      return found;
    },
  );

export const createClaim = (input: Parameters<typeof api.createClaim>[0]) =>
  fallback(
    () => api.createClaim(input),
    () => {
      const id = `0xclaim${Date.now().toString(16)}`;
      const record: ClaimRecord = {
        claimId: id,
        contentId: input.contentId,
        rootContentId: input.rootContentId,
        claimant: "0x0000000000000000000000000000000000000000",
        subject: input.subject,
        evidenceHash: `0x${Math.random().toString(16).slice(2, 18)}`,
        state: "OPEN",
        createdAt: Math.floor(Date.now() / 1000),
      };
      demoClaims[id] = record;
      return record;
    },
  );

export const getClaim = (id: string) =>
  fallback(
    () => api.getClaim(id),
    () => {
      const found = demoClaims[id];
      if (!found) throw new Error("claim not found");
      return found;
    },
  );

export const createChallenge = (postId: string) =>
  fallback(
    () => api.createChallenge(postId),
    () => {
      const id = `0xchal${Date.now().toString(16)}`;
      const record: ChallengeRecord = {
        challengeId: id,
        postId,
        challenger: "0x0000000000000000000000000000000000000000",
        creator: demoPosts.find((p) => p.postId === postId)?.creatorAddress ?? "0x0",
        challengerStake: "500000000000000",
        votingDeadline: Math.floor(Date.now() / 1000) + 300,
        votesGuilty: 0,
        votesNotGuilty: 0,
        state: "VOTING",
      };
      demoChallenges[id] = record;
      return record;
    },
  );

export const voteOnChallenge = (challengeId: string, guilty: boolean) =>
  fallback(
    () => api.voteOnChallenge(challengeId, guilty),
    () => {
      const c = demoChallenges[challengeId];
      if (!c) throw new Error("challenge not found");
      if (guilty) c.votesGuilty += 1;
      else c.votesNotGuilty += 1;
      return { ...c };
    },
  );

export const resolveChallenge = (challengeId: string) =>
  fallback(
    () => api.resolveChallenge(challengeId),
    () => {
      const c = demoChallenges[challengeId];
      if (!c) throw new Error("challenge not found");
      c.state = c.votesGuilty > c.votesNotGuilty ? "RESOLVED_GUILTY" : "RESOLVED_NOT_GUILTY";
      return { ...c };
    },
  );

export const getChallenge = (id: string) =>
  fallback(
    () => api.getChallenge(id),
    () => {
      const found = demoChallenges[id];
      if (!found) throw new Error("challenge not found");
      return found;
    },
  );

/** Challenges known to this session, keyed by post — the API has no list route. */
export function challengesForPost(postId: string): ChallengeRecord[] {
  return Object.values(demoChallenges).filter((c) => c.postId === postId);
}

/** Resolves a mediaUri to something an <img> can load, demo images included. */
export function imageFor(record: ContentRecord | undefined | null, seed?: string): string | null {
  if (!record) return seed ? demoImage(seed) : null;
  if (!record.mediaUri) return demoImage(record.contentId);
  // data:/blob: are local previews; /samples/ is our own fixture art served by
  // Vite. Only a real backend-relative path gets the API origin prefixed.
  if (
    record.mediaUri.startsWith("data:") ||
    record.mediaUri.startsWith("blob:") ||
    record.mediaUri.startsWith("/samples/")
  ) {
    return record.mediaUri;
  }
  return api.mediaUrl(record.mediaUri);
}
