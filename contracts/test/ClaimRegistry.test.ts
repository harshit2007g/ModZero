import { expect } from "chai";
import { ethers } from "hardhat";
import { ContentRegistry, ClaimRegistry } from "../typechain-types";

describe("ClaimRegistry", function () {
  const MIN_STAKE = ethers.parseEther("0.001");

  async function deployFixture() {
    const [creator, claimant, other] = await ethers.getSigners();

    const ContentRegistry = await ethers.getContractFactory("ContentRegistry");
    const contentRegistry = (await ContentRegistry.deploy(MIN_STAKE)) as unknown as ContentRegistry;
    await contentRegistry.waitForDeployment();

    const ClaimRegistry = await ethers.getContractFactory("ClaimRegistry");
    const claimRegistry = (await ClaimRegistry.deploy(
      await contentRegistry.getAddress()
    )) as unknown as ClaimRegistry;
    await claimRegistry.waitForDeployment();

    // Authorize ClaimRegistry to slash stakes — required before any
    // RESOLVED_VALID settlement will succeed.
    await contentRegistry.setClaimRegistry(await claimRegistry.getAddress());

    return { contentRegistry, claimRegistry, creator, claimant, other };
  }

  function makeIds(seed: string) {
    return {
      contentId: ethers.keccak256(ethers.toUtf8Bytes(`content-${seed}`)),
      commitment: ethers.keccak256(ethers.toUtf8Bytes(`commitment-${seed}`)),
      claimId: ethers.keccak256(ethers.toUtf8Bytes(`claim-${seed}`)),
    };
  }

  it("creates a claim in CREATED state", async function () {
    const { claimRegistry, claimant, other } = await deployFixture();
    const { contentId, claimId } = makeIds("1");
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("evidence"));

    await expect(
      claimRegistry.connect(claimant).createClaim(claimId, contentId, contentId, other.address, evidenceHash)
    )
      .to.emit(claimRegistry, "ClaimCreated")
      .withArgs(claimId, contentId, contentId, claimant.address, other.address, evidenceHash);

    const claim = await claimRegistry.claims(claimId);
    expect(claim.state).to.equal(1); // CREATED
  });

  it("rejects creating a duplicate claimId", async function () {
    const { claimRegistry, claimant, other } = await deployFixture();
    const { contentId, claimId } = makeIds("2");
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("evidence"));

    await claimRegistry.connect(claimant).createClaim(claimId, contentId, contentId, other.address, evidenceHash);
    await expect(
      claimRegistry.connect(claimant).createClaim(claimId, contentId, contentId, other.address, evidenceHash)
    ).to.be.revertedWith("claim already exists");
  });

  it("resolving RESOLVED_VALID slashes the accused content's stake to the claimant", async function () {
    const { contentRegistry, claimRegistry, creator, claimant, other } = await deployFixture();
    const { contentId, commitment, claimId } = makeIds("3");
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("evidence"));

    // "other" registers content with a real stake — they're the accused party.
    await contentRegistry.connect(other).registerContent(contentId, commitment, ethers.ZeroHash, {
      value: MIN_STAKE,
    });

    await claimRegistry.connect(claimant).createClaim(claimId, contentId, contentId, other.address, evidenceHash);

    const claimantBalanceBefore = await ethers.provider.getBalance(claimant.address);

    const tx = await claimRegistry.resolveClaim(claimId, 3); // RESOLVED_VALID
    await expect(tx).to.emit(claimRegistry, "ClaimResolved").withArgs(claimId, 3, MIN_STAKE);

    const claimantBalanceAfter = await ethers.provider.getBalance(claimant.address);
    expect(claimantBalanceAfter - claimantBalanceBefore).to.equal(MIN_STAKE);

    // Stake should now be zeroed on ContentRegistry — can't be slashed twice.
    const content = await contentRegistry.getContent(contentId);
    expect(content.stake).to.equal(0n);
  });

  it("resolving RESOLVED_INVALID does not move any funds", async function () {
    const { contentRegistry, claimRegistry, claimant, other } = await deployFixture();
    const { contentId, commitment, claimId } = makeIds("4");
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("evidence"));

    await contentRegistry.connect(other).registerContent(contentId, commitment, ethers.ZeroHash, {
      value: MIN_STAKE,
    });
    await claimRegistry.connect(claimant).createClaim(claimId, contentId, contentId, other.address, evidenceHash);

    await expect(claimRegistry.resolveClaim(claimId, 4)) // RESOLVED_INVALID
      .to.emit(claimRegistry, "ClaimResolved")
      .withArgs(claimId, 4, 0n);

    const content = await contentRegistry.getContent(contentId);
    expect(content.stake).to.equal(MIN_STAKE); // untouched
  });

  it("reverts resolving a claim against content with no stake to slash", async function () {
    const { claimRegistry, claimant, other } = await deployFixture();
    const { contentId, claimId } = makeIds("5");
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("evidence"));

    // Note: content was never registered at all, so ContentRegistry.getContent
    // will revert with "content not found" when slashStake tries to read it.
    await claimRegistry.connect(claimant).createClaim(claimId, contentId, contentId, other.address, evidenceHash);

    await expect(claimRegistry.resolveClaim(claimId, 3)).to.be.reverted; // RESOLVED_VALID
  });

  it("rejects resolving a claim that's already resolved", async function () {
    const { contentRegistry, claimRegistry, claimant, other } = await deployFixture();
    const { contentId, commitment, claimId } = makeIds("6");
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("evidence"));

    await contentRegistry.connect(other).registerContent(contentId, commitment, ethers.ZeroHash, {
      value: MIN_STAKE,
    });
    await claimRegistry.connect(claimant).createClaim(claimId, contentId, contentId, other.address, evidenceHash);
    await claimRegistry.resolveClaim(claimId, 4); // RESOLVED_INVALID

    await expect(claimRegistry.resolveClaim(claimId, 3)).to.be.revertedWith("bad state");
  });

  it("rejects slashStake calls from anyone other than the authorized ClaimRegistry", async function () {
    const { contentRegistry, other } = await deployFixture();
    const { contentId, commitment } = makeIds("7");

    await contentRegistry.connect(other).registerContent(contentId, commitment, ethers.ZeroHash, {
      value: MIN_STAKE,
    });

    await expect(
      contentRegistry.connect(other).slashStake(contentId, other.address)
    ).to.be.revertedWith("caller is not the authorized ClaimRegistry");
  });
});