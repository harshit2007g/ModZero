import { ethers } from "ethers";

/**
 * ENS names live on Ethereum mainnet, not Sepolia — this is a separate,
 * read-only provider used ONLY for name resolution. No wallet, no writes,
 * no gas. Uses a public RPC so no API key is required for this piece.
 */
const mainnetProvider = new ethers.JsonRpcProvider("https://ethereum-rpc.publicnode.com");

/**
 * Forward resolution: "alice.eth" -> "0xAbC123..." or null if unregistered.
 */
export async function resolveEnsName(name: string): Promise<string | null> {
  try {
    const address = await mainnetProvider.resolveName(name);
    return address;
  } catch {
    return null;
  }
}

/**
 * Reverse resolution: "0xAbC123..." -> "alice.eth" or null if the address
 * has no primary ENS name set.
 */
export async function lookupEnsName(address: string): Promise<string | null> {
  try {
    const name = await mainnetProvider.lookupAddress(address);
    return name;
  } catch {
    return null;
  }
}