import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying UsernameRegistryV1 with:", deployer.address);

  const UsernameRegistryV1 = await ethers.getContractFactory("UsernameRegistryV1");
  const registry = await UsernameRegistryV1.deploy();
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  console.log("USERNAME_REGISTRY_ADDRESS=" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});