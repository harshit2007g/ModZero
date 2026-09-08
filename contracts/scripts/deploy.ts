import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // TODO: pick a realistic min stake for testnet demo purposes — spec §24
  // says "do not hard-code an economically unrealistic amount."
  const MIN_STAKE = ethers.parseEther("0.001");

  const ContentRegistry = await ethers.getContractFactory("ContentRegistry");
  const contentRegistry = await ContentRegistry.deploy(MIN_STAKE);
  await contentRegistry.waitForDeployment();
  console.log("ContentRegistry deployed to:", await contentRegistry.getAddress());

  const LicenseRegistry = await ethers.getContractFactory("LicenseRegistry");
  const licenseRegistry = await LicenseRegistry.deploy();
  await licenseRegistry.waitForDeployment();
  console.log("LicenseRegistry deployed to:", await licenseRegistry.getAddress());

  const ClaimRegistry = await ethers.getContractFactory("ClaimRegistry");
  const claimRegistry = await ClaimRegistry.deploy();
  await claimRegistry.waitForDeployment();
  console.log("ClaimRegistry deployed to:", await claimRegistry.getAddress());

  console.log("\nAdd these to your .env:");
  console.log(`CONTENT_REGISTRY_ADDRESS=${await contentRegistry.getAddress()}`);
  console.log(`LICENSE_REGISTRY_ADDRESS=${await licenseRegistry.getAddress()}`);
  console.log(`CLAIM_REGISTRY_ADDRESS=${await claimRegistry.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
