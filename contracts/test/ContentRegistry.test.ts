import { expect } from "chai";
import { ethers } from "hardhat";
import { ContentRegistry } from "../typechain-types";

describe("ContentRegistry", function () {
  const MIN_STAKE = ethers.parseEther("0.001");

  async function deployFixture() {
    const [creator, other] = await ethers.getSigners();
    const ContentRegistry = await ethers.getContractFactory("ContentRegistry");
    const registry = (await ContentRegistry.deploy(MIN_STAKE)) as unknown as ContentRegistry;
    await registry.waitForDeployment();
    return { registry, creator, other };
  }

  function makeIds() {
    // contentId / commitment are bytes32 in the contract — using keccak256
    // of arbitrary strings is fine for tests, mirrors how the backend would
    // derive them from real content in practice (spec §9, §12).
    const contentId = ethers.keccak256(ethers.toUtf8Bytes("test-content-1"));
    const commitment = ethers.keccak256(ethers.toUtf8Bytes("secret+fingerprint+contentId"));
    return { contentId, commitment };
  }

  it("registers root content with a sufficient stake", async function () {
    const { registry, creator } = await deployFixture();
    const { contentId, commitment } = makeIds();
    const parentContentId = ethers.ZeroHash;

    await expect(
      registry.connect(creator).registerContent(contentId, commitment, parentContentId, {
        value: MIN_STAKE,
      })
    )
      .to.emit(registry, "ContentRegistered")
      .withArgs(contentId, creator.address, commitment, parentContentId, MIN_STAKE);

    const content = await registry.getContent(contentId);
    expect(content.creator).to.equal(creator.address);
    expect(content.commitment).to.equal(commitment);
    expect(content.stake).to.equal(MIN_STAKE);
    expect(content.exists).to.equal(true);
  });

  it("rejects registration below the minimum stake", async function () {
    const { registry, creator } = await deployFixture();
    const { contentId, commitment } = makeIds();

    await expect(
      registry.connect(creator).registerContent(contentId, commitment, ethers.ZeroHash, {
        value: MIN_STAKE - 1n,
      })
    ).to.be.revertedWith("insufficient stake");
  });

  it("rejects registering the same contentId twice", async function () {
    const { registry, creator, other } = await deployFixture();
    const { contentId, commitment } = makeIds();

    await registry.connect(creator).registerContent(contentId, commitment, ethers.ZeroHash, {
      value: MIN_STAKE,
    });

    await expect(
      registry.connect(other).registerContent(contentId, commitment, ethers.ZeroHash, {
        value: MIN_STAKE,
      })
    ).to.be.revertedWith("content already registered");
  });

  it("reverts when fetching a content id that was never registered", async function () {
    const { registry } = await deployFixture();
    const { contentId } = makeIds();

    await expect(registry.getContent(contentId)).to.be.revertedWith("content not found");
  });

  it("lets the owner update the minimum stake", async function () {
    const { registry, creator, other } = await deployFixture();
    const newMin = ethers.parseEther("0.005");

    // creator is the deployer, so also the Ownable owner here
    await registry.connect(creator).setMinStake(newMin);
    expect(await registry.minStake()).to.equal(newMin);

    // a non-owner should not be able to change it
    await expect(registry.connect(other).setMinStake(newMin)).to.be.reverted;
  });
});