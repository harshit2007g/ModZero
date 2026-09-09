const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

export interface ContentRecord {
  contentId: string;
  creatorAddress: string;
  ensName: string | null;
  parentContentId: string | null;
  mediaUri: string | null;
  fingerprint: string | null;
  fingerprintAlgorithm: string | null;
  watermarkIdentifier: string | null;
  commitment: string;
  createdAt: string;
  hederaSequence: number | null;
  ethereumTxHash: string | null;
  licenseStatus: string;
  claimStatus: string;
}

export interface VerifyResult {
  probableRootContentId: string | null;
  fingerprintMatch: boolean;
  fingerprintSimilarity: number;
  detectedWatermark: string | null;
  watermarkMatch: boolean;
  hasValidLicense: boolean;
  recommendation: "CLAIM_ELIGIBLE" | "NO_MATCH";
}

export interface LicenseRecord {
  licenseId: string;
  contentId: string;
  licensor: string;
  licensee: string;
  termsHash: string;
  issuedAt: string;
  expiresAt: string | null;
  price: string;
  currency: string;
  terms: { commercial: boolean; modification: boolean; attribution: boolean };
  ethereumTxHash: string;
}

export interface ClaimRecord {
  claimId: string;
  contentId: string;
  rootContentId: string;
  claimant: string;
  subject: string;
  evidenceHash: string;
  state: string;
  createdAt: number;
  ethereumTxHash?: string;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function registerContent(file: File, ensName: string, creatorAddress: string) {
  const form = new FormData();
  form.append("image", file);
  form.append("ensName", ensName);
  form.append("creatorAddress", creatorAddress);
  const res = await fetch(`${API_BASE}/content`, { method: "POST", body: form });
  return handle<ContentRecord>(res);
}

export async function getContent(contentId: string) {
  const res = await fetch(`${API_BASE}/content/${contentId}`);
  return handle<ContentRecord>(res);
}

export async function getContentGraph(contentId: string) {
  const res = await fetch(`${API_BASE}/content/${contentId}/graph`);
  return handle<{ rootContentId: string; nodes: any[]; edges: any[] }>(res);
}

export async function verifyContent(file: File, requester: string) {
  const form = new FormData();
  form.append("image", file);
  form.append("requester", requester);
  const res = await fetch(`${API_BASE}/verify`, { method: "POST", body: form });
  return handle<VerifyResult>(res);
}

export async function requestLicense(input: {
  contentId: string;
  requester: string;
  usage: "commercial" | "nonCommercial";
  intendsModification?: boolean;
  intendsPoliticalUse?: boolean;
}) {
  const res = await fetch(`${API_BASE}/license/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<LicenseRecord>(res);
}

export async function getLicense(licenseId: string) {
  const res = await fetch(`${API_BASE}/license/${licenseId}`);
  return handle<LicenseRecord>(res);
}

export async function createClaim(input: { contentId: string; rootContentId: string; subject: string }) {
  const res = await fetch(`${API_BASE}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<ClaimRecord>(res);
}

export async function getClaim(claimId: string) {
  const res = await fetch(`${API_BASE}/claim/${claimId}`);
  return handle<ClaimRecord>(res);
}
export interface PostRecord {
  postId: string;
  creatorAddress: string;
  text: string;
  textHash: string;
  contentId: string | null;
  createdAt: string;
  ethereumTxHash: string;
  hederaSequence?: number;
  creatorReputation?: number;
}

export interface ChallengeRecord {
  challengeId: string;
  postId: string;
  challenger: string;
  creator: string;
  challengerStake: string;
  votingDeadline: number;
  votesGuilty: number;
  votesNotGuilty: number;
  state: string;
  ethereumTxHash?: string;
  hederaSequence?: number;
}

export async function createPost(text: string, creatorAddress: string, image?: File) {
  const form = new FormData();
  form.append("text", text);
  form.append("creatorAddress", creatorAddress);
  if (image) form.append("image", image);
  const res = await fetch(`${API_BASE}/post`, { method: "POST", body: form });
  return handle<PostRecord>(res);
}

export async function listPosts() {
  const res = await fetch(`${API_BASE}/posts`);
  return handle<PostRecord[]>(res);
}

export async function getPost(postId: string) {
  const res = await fetch(`${API_BASE}/post/${postId}`);
  return handle<PostRecord>(res);
}

export async function createChallenge(postId: string) {
  const res = await fetch(`${API_BASE}/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId }),
  });
  return handle<ChallengeRecord>(res);
}

export async function voteOnChallenge(challengeId: string, guilty: boolean) {
  const res = await fetch(`${API_BASE}/challenge/${challengeId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guilty }),
  });
  return handle<ChallengeRecord>(res);
}

export async function resolveChallenge(challengeId: string) {
  const res = await fetch(`${API_BASE}/challenge/${challengeId}/resolve`, { method: "POST" });
  return handle<ChallengeRecord>(res);
}

export async function getChallenge(challengeId: string) {
  const res = await fetch(`${API_BASE}/challenge/${challengeId}`);
  return handle<ChallengeRecord>(res);
}
export function mediaUrl(mediaUri: string | null): string | null {
  if (!mediaUri) return null;
  return `${API_BASE}${mediaUri}`;
}