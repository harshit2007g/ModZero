import { expect } from "chai";
import { ethers } from "hardhat";
import { PostRegistry } from "../typechain-types";

describe("PostRegistry", function () {
  const MIN_STAKE = ethers.parseEther("0.0005");

  async function deployFixture() {
    const [creator] = await ethers.getSigners();
    const PostRegistry = await ethers.getContractFactory("PostRegistry");
    const registry = (await PostRegistry.deploy(MIN_STAKE)) as unknown as PostRegistry;
    await registry.waitForDeployment();
    return { registry, creator };
  }

  it("creates a text-only post (no image)", async function () {
    const { registry, creator } = await deployFixture();
    const postId = ethers.keccak256(ethers.toUtf8Bytes("post-1"));
    const textHash = ethers.keccak256(ethers.toUtf8Bytes("hello subreddit"));

    await expect(
      registry.connect(creator).createPost(postId, textHash, ethers.ZeroHash, { value: MIN_STAKE })
    )
      .to.emit(registry, "PostCreated")
      .withArgs(postId, creator.address, textHash, ethers.ZeroHash, MIN_STAKE);

    const post = await registry.getPost(postId);
    expect(post.creator).to.equal(creator.address);
    expect(post.contentId).to.equal(ethers.ZeroHash);
  });

  it("rejects insufficient stake", async function () {
    const { registry, creator } = await deployFixture();
    const postId = ethers.keccak256(ethers.toUtf8Bytes("post-2"));
    const textHash = ethers.keccak256(ethers.toUtf8Bytes("text"));

    await expect(
      registry.connect(creator).createPost(postId, textHash, ethers.ZeroHash, { value: MIN_STAKE - 1n })
    ).to.be.revertedWith("insufficient stake");
  });

  it("rejects duplicate postId", async function () {
    const { registry, creator } = await deployFixture();
    const postId = ethers.keccak256(ethers.toUtf8Bytes("post-3"));
    const textHash = ethers.keccak256(ethers.toUtf8Bytes("text"));

    await registry.connect(creator).createPost(postId, textHash, ethers.ZeroHash, { value: MIN_STAKE });
    await expect(
      registry.connect(creator).createPost(postId, textHash, ethers.ZeroHash, { value: MIN_STAKE })
    ).to.be.revertedWith("post already exists");
  });
});