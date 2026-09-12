import { ethers } from "hardhat";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(
        `  [retry] ${label} failed on attempt ${attempt}/${MAX_RETRIES}: ${(error as Error).message
        }`
      );
      if (attempt < MAX_RETRIES) {
        await new Promise((res) => setTimeout(res, RETRY_DELAY_MS * attempt));
      }
    }
  }
  throw lastError;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const MIN_STAKE = ethers.parseEther("0.001");
  const MIN_POST_STAKE = ethers.parseEther("0.0005");
  const MIN_CHALLENGE_STAKE = ethers.parseEther("0.0005");
  const VOTING_PERIOD = 5 * 60; // 5 minutes — demo-friendly
  const MIN_QUORUM = 3;

  const ContentRegistry = await ethers.getContractFactory("ContentRegistry");
  const contentRegistry = await withRetry("ContentRegistry.deploy", () =>
    ContentRegistry.deploy(MIN_STAKE)
  );
  await withRetry("ContentRegistry.waitForDeployment", () =>
    contentRegistry.waitForDeployment()
  );
  const contentRegistryAddress = await contentRegistry.getAddress();
  console.log("ContentRegistry deployed to:", contentRegistryAddress);

  const LicenseRegistry = await ethers.getContractFactory("LicenseRegistry");
  const licenseRegistry = await withRetry("LicenseRegistry.deploy", () =>
    LicenseRegistry.deploy()
  );
  await withRetry("LicenseRegistry.waitForDeployment", () =>
    licenseRegistry.waitForDeployment()
  );
  const licenseRegistryAddress = await licenseRegistry.getAddress();
  console.log("LicenseRegistry deployed to:", licenseRegistryAddress);

  const ClaimRegistry = await ethers.getContractFactory("ClaimRegistry");
  const claimRegistry = await withRetry("ClaimRegistry.deploy", () =>
    ClaimRegistry.deploy(contentRegistryAddress)
  );
  await withRetry("ClaimRegistry.waitForDeployment", () =>
    claimRegistry.waitForDeployment()
  );
  const claimRegistryAddress = await claimRegistry.getAddress();
  console.log("ClaimRegistry deployed to:", claimRegistryAddress);

  // Authorize ClaimRegistry to slash stakes on ContentRegistry — must be
  // done after both are deployed (chicken-and-egg).
  const authTx = await withRetry("setClaimRegistry send", () =>
    contentRegistry.setClaimRegistry(claimRegistryAddress)
  );
  await withRetry("setClaimRegistry wait", () => authTx.wait());
  console.log("ContentRegistry authorized ClaimRegistry for slashing");

  const PostRegistry = await ethers.getContractFactory("PostRegistry");
  const postRegistry = await withRetry("PostRegistry.deploy", () =>
    PostRegistry.deploy(MIN_POST_STAKE)
  );
  await withRetry("PostRegistry.waitForDeployment", () =>
    postRegistry.waitForDeployment()
  );
  const postRegistryAddress = await postRegistry.getAddress();
  console.log("PostRegistry deployed to:", postRegistryAddress);

  const ChallengeRegistry = await ethers.getContractFactory("ChallengeRegistry");
  const challengeRegistry = await withRetry("ChallengeRegistry.deploy", () =>
    ChallengeRegistry.deploy(MIN_CHALLENGE_STAKE, VOTING_PERIOD, MIN_QUORUM)
  );
  await withRetry("ChallengeRegistry.waitForDeployment", () =>
    challengeRegistry.waitForDeployment()
  );
  const challengeRegistryAddress = await challengeRegistry.getAddress();
  console.log("ChallengeRegistry deployed to:", challengeRegistryAddress);

  const UsernameRegistry = await ethers.getContractFactory("UsernameRegistry");
  const usernameRegistry = await withRetry("UsernameRegistry.deploy", () =>
    UsernameRegistry.deploy()
  );
  await withRetry("UsernameRegistry.waitForDeployment", () =>
    usernameRegistry.waitForDeployment()
  );
  const usernameRegistryAddress = await usernameRegistry.getAddress();
  console.log("UsernameRegistry deployed to:", usernameRegistryAddress);

  console.log("\nAdd these to your .env:");
  console.log(`CONTENT_REGISTRY_ADDRESS=${contentRegistryAddress}`);
  console.log(`LICENSE_REGISTRY_ADDRESS=${licenseRegistryAddress}`);
  console.log(`CLAIM_REGISTRY_ADDRESS=${claimRegistryAddress}`);
  console.log(`POST_REGISTRY_ADDRESS=${postRegistryAddress}`);
  console.log(`CHALLENGE_REGISTRY_ADDRESS=${challengeRegistryAddress}`);
  console.log(`USERNAME_REGISTRY_ADDRESS=${usernameRegistryAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});