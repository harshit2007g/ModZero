import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const MIN_STAKE = ethers.parseEther("0.001");
  const MIN_POST_STAKE = ethers.parseEther("0.0005");
  const MIN_CHALLENGE_STAKE = ethers.parseEther("0.0005");
  const VOTING_PERIOD = 5*60; //5 min for demo purposes
  const MIN_QUORUM = 5;

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

  const PostRegistry = await ethers.getContractFactory("PostRegistry");
  const postRegistry = await PostRegistry.deploy(MIN_POST_STAKE);
  await postRegistry.waitForDeployment();
  console.log("PostRegistry deployed to:", await postRegistry.getAddress());

  const ChallengeRegistry = await ethers.getContractFactory("ChallengeRegistry");
  const challengeRegistry = await ChallengeRegistry.deploy(MIN_CHALLENGE_STAKE, VOTING_PERIOD, MIN_QUORUM);
  await challengeRegistry.waitForDeployment();
  console.log("ChallengeRegistry deployed to:", await challengeRegistry.getAddress());

  console.log("\nAdd these to your .env:");
  console.log(`CONTENT_REGISTRY_ADDRESS=${await contentRegistry.getAddress()}`);
  console.log(`LICENSE_REGISTRY_ADDRESS=${await licenseRegistry.getAddress()}`);
  console.log(`CLAIM_REGISTRY_ADDRESS=${await claimRegistry.getAddress()}`);
  console.log(`POST_REGISTRY_ADDRESS=${await postRegistry.getAddress()}`);
  console.log(`CHALLENGE_REGISTRY_ADDRESS=${await challengeRegistry.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});