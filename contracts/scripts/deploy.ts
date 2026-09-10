import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const MIN_STAKE = ethers.parseEther("0.001");
  const MIN_POST_STAKE = ethers.parseEther("0.0005");
  const MIN_CHALLENGE_STAKE = ethers.parseEther("0.0005");
  const VOTING_PERIOD = 5 * 60; // 5 minutes — demo-friendly
  const MIN_QUORUM = 3;

  const ContentRegistry = await ethers.getContractFactory("ContentRegistry");
  const contentRegistry = await ContentRegistry.deploy(MIN_STAKE);
  await contentRegistry.waitForDeployment();
  const contentRegistryAddress = await contentRegistry.getAddress();
  console.log("ContentRegistry deployed to:", contentRegistryAddress);

  const LicenseRegistry = await ethers.getContractFactory("LicenseRegistry");
  const licenseRegistry = await LicenseRegistry.deploy();
  await licenseRegistry.waitForDeployment();
  console.log("LicenseRegistry deployed to:", await licenseRegistry.getAddress());

  const ClaimRegistry = await ethers.getContractFactory("ClaimRegistry");
  const claimRegistry = await ClaimRegistry.deploy(contentRegistryAddress);
  await claimRegistry.waitForDeployment();
  const claimRegistryAddress = await claimRegistry.getAddress();
  console.log("ClaimRegistry deployed to:", claimRegistryAddress);

  // Authorize ClaimRegistry to slash stakes on ContentRegistry — must be
  // done after both are deployed (chicken-and-egg).
  const authTx = await contentRegistry.setClaimRegistry(claimRegistryAddress);
  await authTx.wait();
  console.log("ContentRegistry authorized ClaimRegistry for slashing");

  const PostRegistry = await ethers.getContractFactory("PostRegistry");
  const postRegistry = await PostRegistry.deploy(MIN_POST_STAKE);
  await postRegistry.waitForDeployment();
  console.log("PostRegistry deployed to:", await postRegistry.getAddress());

  const ChallengeRegistry = await ethers.getContractFactory("ChallengeRegistry");
  const challengeRegistry = await ChallengeRegistry.deploy(MIN_CHALLENGE_STAKE, VOTING_PERIOD, MIN_QUORUM);
  await challengeRegistry.waitForDeployment();
  console.log("ChallengeRegistry deployed to:", await challengeRegistry.getAddress());

  console.log("\nAdd these to your .env:");
  console.log(`CONTENT_REGISTRY_ADDRESS=${contentRegistryAddress}`);
  console.log(`LICENSE_REGISTRY_ADDRESS=${await licenseRegistry.getAddress()}`);
  console.log(`CLAIM_REGISTRY_ADDRESS=${claimRegistryAddress}`);
  console.log(`POST_REGISTRY_ADDRESS=${await postRegistry.getAddress()}`);
  console.log(`CHALLENGE_REGISTRY_ADDRESS=${await challengeRegistry.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});