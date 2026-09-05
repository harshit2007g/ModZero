import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

/**
 * Minimal ABI — just the functions/events the backend actually needs to
 * call. Keeping this hand-written (rather than importing the full Hardhat
 * artifact) avoids a cross-workspace file-path dependency between
 * backend/ and contracts/.
 */
const CONTENT_REGISTRY_ABI = [
  "function registerContent(bytes32 contentId, bytes32 commitment, bytes32 parentContentId) external payable",
  "function getContent(bytes32 contentId) external view returns (tuple(address creator, bytes32 commitment, bytes32 parentContentId, uint256 stake, uint64 registeredAt, bool exists))",
  "function minStake() external view returns (uint256)",
];

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

export const contentRegistry = new ethers.Contract(
  process.env.CONTENT_REGISTRY_ADDRESS as string,
  CONTENT_REGISTRY_ABI,
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