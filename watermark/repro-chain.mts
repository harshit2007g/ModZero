import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config({ path: "D:/modzero/.env" });

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const blockNumber = await provider.getBlockNumber();
console.log("chain blockNumber:", blockNumber);
const net = await provider.getNetwork();
console.log("network:", net.name, net.chainId);

const LICENSE_ABI = ["function hasValidLicense(bytes32 contentId, address user) external view returns (bool)"];
const license = new ethers.Contract(process.env.LICENSE_REGISTRY_ADDRESS, LICENSE_ABI, provider);
const contentId = "0xa055f1935435fb1902ef6df1e9e935fbe2aedb7eb8c8d016bce88ff1f34153a9";
const creator = "0x7fbc31df5d320D4dd7f877DDe5D880Aaf388E106";
for (const [label, user] of [
  ["creator", creator],
  ["zero address", ethers.ZeroAddress],
]) {
  try {
    const v = await license.hasValidLicense(contentId, user);
    console.log(`hasValidLicense(${label}) =`, v);
  } catch (e) {
    console.log(`hasValidLicense(${label}) threw:`, e.shortMessage ?? e.message);
  }
}