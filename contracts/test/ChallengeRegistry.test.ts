import { expect } from "chai";
import { ethers } from "hardhat";
import { ChallengeRegistry } from "../typechain-types";

describe("ChallengeRegistry", function () {
  const MIN_STAKE = ethers.parseEther("0.0005");
  const VOTING_PERIOD = 60; // seconds, short for tests
  const MIN_QUORUM = 3;

  async function deployFixture() {
    const [challenger, creator, voter2, voter3, voter4] = await ethers.getSigners();
    const ChallengeRegistry = await ethers.getContractFactory("ChallengeRegistry");
    const registry = (await ChallengeRegistry.deploy(
      MIN_STAKE,
      VOTING_PERIOD,
      MIN_QUORUM
    )) as unknown as ChallengeRegistry;
    await registry.waitForDeployment();
    return { registry, challenger, creator, voter2, voter3, voter4 };
  }

  async function advanceTime(seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  it("creates a challenge and opens voting", async function () {
    const { registry, challenger, creator } = await deployFixture();
    const challengeId = ethers.keccak256(ethers.toUtf8Bytes("challenge-1"));
    const postId = ethers.keccak256(ethers.toUtf8Bytes("post-1"));

    await expect(
      registry.connect(challenger).createChallenge(challengeId, postId, creator.address, { value: MIN_STAKE })
    ).to.emit(registry, "ChallengeCreated");

    const challenge = await registry.challenges(challengeId);
    expect(challenge.state).to.equal(1); // VOTING
  });

  it("resolves GUILTY when guilty votes win, with quorum met", async function () {
    const { registry, challenger, creator, voter2, voter3, voter4 } = await deployFixture();
    const challengeId = ethers.keccak256(ethers.toUtf8Bytes("challenge-2"));
    const postId = ethers.keccak256(ethers.toUtf8Bytes("post-2"));

    await registry.connect(challenger).createChallenge(challengeId, postId, creator.address, { value: MIN_STAKE });

    await registry.connect(challenger).vote(challengeId, true);
    await registry.connect(voter2).vote(challengeId, true);
    await registry.connect(voter3).vote(challengeId, false);

    await advanceTime(VOTING_PERIOD + 1);

    await expect(registry.resolveChallenge(challengeId)).to.emit(registry, "ChallengeResolved");

    const challenge = await registry.challenges(challengeId);
    expect(challenge.state).to.equal(2); // RESOLVED_GUILTY

    const rep = await registry.getReputation(creator.address);
    expect(rep).to.equal(90n); // 100 baseline - 10 penalty
  });

  it("resolves NOT_GUILTY and leaves reputation untouched", async function () {
    const { registry, challenger, creator, voter2, voter3 } = await deployFixture();
    const challengeId = ethers.keccak256(ethers.toUtf8Bytes("challenge-3"));
    const postId = ethers.keccak256(ethers.toUtf8Bytes("post-3"));

    await registry.connect(challenger).createChallenge(challengeId, postId, creator.address, { value: MIN_STAKE });

    await registry.connect(challenger).vote(challengeId, true);
    await registry.connect(voter2).vote(challengeId, false);
    await registry.connect(voter3).vote(challengeId, false);

    await advanceTime(VOTING_PERIOD + 1);
    await registry.resolveChallenge(challengeId);

    const challenge = await registry.challenges(challengeId);
    expect(challenge.state).to.equal(3); // RESOLVED_NOT_GUILTY

    const rep = await registry.getReputation(creator.address);
    expect(rep).to.equal(100n); // untouched baseline
  });

  it("rejects resolution before quorum is met", async function () {
    const { registry, challenger, creator, voter2 } = await deployFixture();
    const challengeId = ethers.keccak256(ethers.toUtf8Bytes("challenge-4"));
    const postId = ethers.keccak256(ethers.toUtf8Bytes("post-4"));

    await registry.connect(challenger).createChallenge(challengeId, postId, creator.address, { value: MIN_STAKE });
    await registry.connect(challenger).vote(challengeId, true);
    await registry.connect(voter2).vote(challengeId, true);
    // only 2 votes cast, quorum is 3

    await advanceTime(VOTING_PERIOD + 1);
    await expect(registry.resolveChallenge(challengeId)).to.be.revertedWith("quorum not reached");
  });

  it("rejects double voting from the same address", async function () {
    const { registry, challenger, creator } = await deployFixture();
    const challengeId = ethers.keccak256(ethers.toUtf8Bytes("challenge-5"));
    const postId = ethers.keccak256(ethers.toUtf8Bytes("post-5"));

    await registry.connect(challenger).createChallenge(challengeId, postId, creator.address, { value: MIN_STAKE });
    await registry.connect(challenger).vote(challengeId, true);

    await expect(registry.connect(challenger).vote(challengeId, false)).to.be.revertedWith("already voted");
  });

  it("rejects voting after the deadline", async function () {
    const { registry, challenger, creator, voter2 } = await deployFixture();
    const challengeId = ethers.keccak256(ethers.toUtf8Bytes("challenge-6"));
    const postId = ethers.keccak256(ethers.toUtf8Bytes("post-6"));

    await registry.connect(challenger).createChallenge(challengeId, postId, creator.address, { value: MIN_STAKE });
    await advanceTime(VOTING_PERIOD + 1);

    await expect(registry.connect(voter2).vote(challengeId, true)).to.be.revertedWith("voting period has ended");
  });
});