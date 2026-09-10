import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const CONTENT_REGISTRY_ABI = [
  "function registerContent(bytes32 contentId, bytes32 commitment, bytes32 parentContentId) external payable",
  "function getContent(bytes32 contentId) external view returns (tuple(address creator, bytes32 commitment, bytes32 parentContentId, uint256 stake, uint64 registeredAt, bool exists))",
  "function minStake() external view returns (uint256)",
];

const LICENSE_REGISTRY_ABI = [
  "function hasValidLicense(bytes32 contentId, address user) external view returns (bool)",
  "function issueLicense(bytes32 licenseId, bytes32 contentId, address licensor, address licensee, bytes32 termsHash, uint64 expiresAt) external",
];

const CLAIM_REGISTRY_ABI = [
  "function createClaim(bytes32 claimId, bytes32 contentId, bytes32 rootContentId, address subject, bytes32 evidenceHash) external",
  "function claims(bytes32 claimId) external view returns (bytes32 contentId, bytes32 rootContentId, address claimant, address subject, bytes32 evidenceHash, uint8 state, uint64 createdAt)",
  "function resolveClaim(bytes32 claimId, uint8 outcome) external",
];

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

export const contentRegistry = new ethers.Contract(
  process.env.CONTENT_REGISTRY_ADDRESS as string,
  CONTENT_REGISTRY_ABI,
  wallet
);

export const licenseRegistry = new ethers.Contract(
  process.env.LICENSE_REGISTRY_ADDRESS as string,
  LICENSE_REGISTRY_ABI,
  wallet
);

export const claimRegistry = new ethers.Contract(
  process.env.CLAIM_REGISTRY_ADDRESS as string,
  CLAIM_REGISTRY_ABI,
  wallet
);

/**
 * Registers content on-chain and waits for confirmation. Costs the
 * contract's current minStake in (test)ETH from the backend's wallet each
 * time this is called — expected on Sepolia testnet, funded via faucet.
 */
export async function registerContentOnChain(
  contentId: string,
  commitment: string,
  parentContentId: string | null
): Promise<string> {
  const minStake = await contentRegistry.minStake();
  const parentId = parentContentId ?? ethers.ZeroHash;

  const tx = await contentRegistry.registerContent(contentId, commitment, parentId, {
    value: minStake,
  });
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Checks LicenseRegistry directly on-chain — the real check per spec §23,
 * replacing the old hardcoded `false` placeholder in /verify.
 */
export async function checkValidLicenseOnChain(contentId: string, userAddress: string): Promise<boolean> {
  if (!ethers.isAddress(userAddress)) return false;
  return licenseRegistry.hasValidLicense(contentId, userAddress);
}

/**
 * Claim state enum must match ClaimRegistry.sol's ClaimState exactly:
 * 0=NONE, 1=CREATED, 2=EVIDENCE_SUBMITTED, 3=RESOLVED_VALID, 4=RESOLVED_INVALID
 */
export const CLAIM_STATE_NAMES = ["NONE", "CREATED", "EVIDENCE_SUBMITTED", "RESOLVED_VALID", "RESOLVED_INVALID"];

export async function createClaimOnChain(
  claimId: string,
  contentId: string,
  rootContentId: string,
  subject: string,
  evidenceHash: string
): Promise<string> {
  const tx = await claimRegistry.createClaim(claimId, contentId, rootContentId, subject, evidenceHash);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function getClaimOnChain(claimId: string) {
  const result = await claimRegistry.claims(claimId);
  return {
    contentId: result.contentId,
    rootContentId: result.rootContentId,
    claimant: result.claimant,
    subject: result.subject,
    evidenceHash: result.evidenceHash,
    state: CLAIM_STATE_NAMES[Number(result.state)],
    createdAt: Number(result.createdAt),
  };
}
/**
 * Issues a license on-chain. Per spec §20, payment (x402) must be
 * independently verified BEFORE this is called — this function only
 * records the resulting license, it does not move any payment itself.
 */
export async function issueLicenseOnChain(
  licenseId: string,
  contentId: string,
  licensor: string,
  licensee: string,
  termsHash: string,
  expiresAt: number
): Promise<string> {
  const tx = await licenseRegistry.issueLicense(licenseId, contentId, licensor, licensee, termsHash, expiresAt);
  const receipt = await tx.wait();
  return receipt.hash;
}
/**
 * Reads a content record directly from ContentRegistry on-chain. Used as
 * a fallback when the in-memory contentStore doesn't have it (e.g. after
 * a backend restart) — the blockchain is always the source of truth
 * (spec §31: "the database is an index/cache... blockchain/HCS remain
 * the source of protocol truth").
 *
 * Note: on-chain storage only has creator/commitment/parentContentId/
 * stake/timestamp — NOT fingerprint, watermark, or mediaUri, since those
 * were never written on-chain (by design, spec §14 — media/fingerprints
 * stay off-chain). So a chain-only fallback record will have those fields
 * as null. This is a known, expected limitation, not a bug — full data
 * requires the off-chain index/database (still TODO) to actually persist.
 */
export async function getContentOnChain(contentId: string) {
  const result = await contentRegistry.getContent(contentId);
  if (!result.exists) return null;
  return {
    contentId,
    creatorAddress: result.creator,
    commitment: result.commitment,
    parentContentId: result.parentContentId === ethers.ZeroHash ? null : result.parentContentId,
    stake: ethers.formatEther(result.stake),
    createdAt: new Date(Number(result.registeredAt) * 1000).toISOString(),
  };
}
const POST_REGISTRY_ABI = [
  "function createPost(bytes32 postId, bytes32 textHash, bytes32 contentId) external payable",
  "function getPost(bytes32 postId) external view returns (tuple(address creator, bytes32 textHash, bytes32 contentId, uint256 stake, uint64 createdAt, bool exists))",
  "function minPostStake() external view returns (uint256)",
];

const CHALLENGE_REGISTRY_ABI = [
  "function createChallenge(bytes32 challengeId, bytes32 postId, address creator) external payable",
  "function vote(bytes32 challengeId, bool guilty) external",
  "function resolveChallenge(bytes32 challengeId) external",
  "function challenges(bytes32 challengeId) external view returns (bytes32 postId, address challenger, address creator, uint256 challengerStake, uint64 votingDeadline, uint256 votesGuilty, uint256 votesNotGuilty, uint8 state)",
  "function getReputation(address creator) external view returns (int256)",
  "function minChallengeStake() external view returns (uint256)",
  "function hasVoted(bytes32 challengeId, address voter) external view returns (bool)",
];

export const postRegistry = new ethers.Contract(
  process.env.POST_REGISTRY_ADDRESS as string,
  POST_REGISTRY_ABI,
  wallet
);

export const challengeRegistry = new ethers.Contract(
  process.env.CHALLENGE_REGISTRY_ADDRESS as string,
  CHALLENGE_REGISTRY_ABI,
  wallet
);

export async function createPostOnChain(
  postId: string,
  textHash: string,
  contentId: string | null
): Promise<string> {
  const minStake = await postRegistry.minPostStake();
  const contentIdArg = contentId ?? ethers.ZeroHash;
  const tx = await postRegistry.createPost(postId, textHash, contentIdArg, { value: minStake });
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function getPostOnChain(postId: string) {
  const result = await postRegistry.getPost(postId);
  if (!result.exists) return null;
  return {
    postId,
    creator: result.creator,
    textHash: result.textHash,
    contentId: result.contentId === ethers.ZeroHash ? null : result.contentId,
    stake: ethers.formatEther(result.stake),
    createdAt: new Date(Number(result.createdAt) * 1000).toISOString(),
  };
}

export async function createChallengeOnChain(
  challengeId: string,
  postId: string,
  creator: string
): Promise<string> {
  const minStake = await challengeRegistry.minChallengeStake();
  const tx = await challengeRegistry.createChallenge(challengeId, postId, creator, { value: minStake });
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function voteOnChallengeOnChain(challengeId: string, guilty: boolean): Promise<string> {
  const tx = await challengeRegistry.vote(challengeId, guilty);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function resolveChallengeOnChain(challengeId: string): Promise<string> {
  const tx = await challengeRegistry.resolveChallenge(challengeId);
  const receipt = await tx.wait();
  return receipt.hash;
}

const CHALLENGE_STATE_NAMES = ["NONE", "VOTING", "RESOLVED_GUILTY", "RESOLVED_NOT_GUILTY"];

export async function getChallengeOnChain(challengeId: string) {
  const result = await challengeRegistry.challenges(challengeId);
  return {
    postId: result.postId,
    challenger: result.challenger,
    creator: result.creator,
    challengerStake: ethers.formatEther(result.challengerStake),
    votingDeadline: Number(result.votingDeadline),
    votesGuilty: Number(result.votesGuilty),
    votesNotGuilty: Number(result.votesNotGuilty),
    state: CHALLENGE_STATE_NAMES[Number(result.state)],
  };
}

export async function getReputationOnChain(creator: string): Promise<number> {
  const rep = await challengeRegistry.getReputation(creator);
  return Number(rep);
}
export async function resolveClaimOnChain(claimId: string, outcome: "VALID" | "INVALID"): Promise<string> {
  const outcomeEnum = outcome === "VALID" ? 3 : 4; // matches ClaimRegistry.ClaimState
  const tx = await claimRegistry.resolveClaim(claimId, outcomeEnum);
  const receipt = await tx.wait();
  return receipt.hash;
}
/**
 * Verifies a claimed payment transaction actually satisfies the license
 * terms before issuance — the real check spec §20 requires ("payment must
 * be independently verified", not trusted because a client claims it
 * happened). Minimal x402-style flow: no formal x402 handshake headers,
 * but the core guarantee (verify on-chain before granting access) is real.
 */
export async function verifyPaymentOnChain(
  txHash: string,
  expectedTo: string,
  expectedFrom: string,
  minValueWei: bigint
): Promise<{ valid: boolean; reason?: string }> {
  const tx = await provider.getTransaction(txHash);
  if (!tx) return { valid: false, reason: "transaction not found" };

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    return { valid: false, reason: "transaction not confirmed or failed" };
  }

  if (!tx.to || tx.to.toLowerCase() !== expectedTo.toLowerCase()) {
    return { valid: false, reason: "payment sent to the wrong address" };
  }

  if (tx.from.toLowerCase() !== expectedFrom.toLowerCase()) {
    return { valid: false, reason: "payment sender does not match the requester" };
  }

  if (tx.value < minValueWei) {
    return { valid: false, reason: "payment amount is insufficient" };
  }

  return { valid: true };
}