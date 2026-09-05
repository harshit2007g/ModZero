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
];

const CLAIM_REGISTRY_ABI = [
  "function createClaim(bytes32 claimId, bytes32 contentId, bytes32 rootContentId, address subject, bytes32 evidenceHash) external",
  "function claims(bytes32 claimId) external view returns (bytes32 contentId, bytes32 rootContentId, address claimant, address subject, bytes32 evidenceHash, uint8 state, uint64 createdAt)",
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