import { keccak256, toUtf8Bytes, randomBytes, hexlify } from "ethers";

/** Random secret per root content registration. Never expose publicly. */
export function generateSecret(): string {
  return hexlify(randomBytes(32));
}

/**
 * Application-level content identifier (spec §9). Deliberately NOT derived
 * from the file's raw bytes, since modified copies would then get a
 * different identity — defeating the point of tracking derivatives.
 */
export function generateContentId(): string {
  return hexlify(randomBytes(32));
}

export interface CommitmentInput {
  secret: string;
  fingerprint: string;
  contentId: string;
  metadata?: string;
}

/**
 * commitment = keccak256(secret || fingerprint || contentId || metadata)
 * per spec §12. Uses keccak256 (not sha256) so the result is directly
 * usable as ContentRegistry.registerContent's bytes32 `commitment` arg.
 */
export function generateCommitment({ secret, fingerprint, contentId, metadata = "" }: CommitmentInput): string {
  const packed = secret + fingerprint + contentId + metadata;
  return keccak256(toUtf8Bytes(packed));
}