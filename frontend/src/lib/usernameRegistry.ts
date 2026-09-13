import { parseAbi } from "viem";

/**
 * The on-chain UsernameRegistry implements the original 1-arg
 * register(string) (owner = msg.sender), matching the contract source in
 * contracts/UsernameRegistry.sol. There is no 2-arg backend-relay variant
 * on-chain or in source — a username can only be claimed by the wallet
 * that owns it.
 *
 * Registration is therefore signed and paid for by the USER's own wallet
 * (owner becomes msg.sender), never relayed by the backend. The backend is
 * only used for /username/lookup + /username/resolve reads. The deployed
 * address below (VITE_USERNAME_REGISTRY_ADDRESS) is 0x0451...F7B.
 *
 * NOTE: the ABI MUST be a parsed viem Abi item, not a bare human-readable
 * string fragment — viem's encodeFunctionData does `'name' in item` during
 * lookup, which throws on a string. parseAbi returns the structured item:
 * { type: "function", name: "register", stateMutability: "nonpayable",
 *   inputs: [{ type: "string" }], outputs: [] }
 */
export const USERNAME_REGISTRY_ADDRESS = import.meta.env
  .VITE_USERNAME_REGISTRY_ADDRESS as `0x${string}` | undefined;

export const USERNAME_REGISTRY_ABI = parseAbi(["function register(string)"]);