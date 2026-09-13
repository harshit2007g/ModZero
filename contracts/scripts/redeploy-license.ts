import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying LicenseRegistry with:", deployer.address);

  const LicenseRegistry = await ethers.getContractFactory("LicenseRegistry");
  const licenseRegistry = await LicenseRegistry.deploy();
  await licenseRegistry.waitForDeployment();
  const address = await licenseRegistry.getAddress();
  console.log("LICENSE_REGISTRY_ADDRESS=" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});