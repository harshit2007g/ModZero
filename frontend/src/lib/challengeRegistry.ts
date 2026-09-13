import { parseAbi } from "viem";

/**
 * The on-chain ChallengeRegistry. Voting is done WALLET-NATIVE from the
 * voter's own wallet so each ballot carries a distinct on-chain address —
 * if the backend signed every vote, every ballot would come from the same
 * address and quorum would be unreachable (spec challenge extension).
 *
 * Create/resolve stay backend-relayed (they move the challenger's stake,
 * which the backend funds on testnet for the demo); only cast votes need a
 * real per-voter signature.
 */
export const CHALLENGE_REGISTRY_ADDRESS = import.meta.env
  .VITE_CHALLENGE_REGISTRY_ADDRESS as `0x${string}` | undefined;

export const CHALLENGE_REGISTRY_ABI = parseAbi([
  "function vote(bytes32 challengeId, bool guilty)",
  "function hasVoted(bytes32 challengeId, address voter) external view returns (bool)",
]);