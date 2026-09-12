import { expect } from "chai";
import { ethers } from "hardhat";
import { UsernameRegistry } from "../typechain-types";

describe("UsernameRegistry", function () {
  async function deployFixture() {
    const [alice, bob] = await ethers.getSigners();
    const UsernameRegistry = await ethers.getContractFactory("UsernameRegistry");
    const registry = (await UsernameRegistry.deploy()) as unknown as UsernameRegistry;
    await registry.waitForDeployment();
    return { registry, alice, bob };
  }

  it("registers a valid username and resolves both directions", async function () {
    const { registry, alice } = await deployFixture();

    await expect(registry.connect(alice).register("harshit"))
      .to.emit(registry, "UsernameRegistered")
      .withArgs("harshit", alice.address);

    expect(await registry.resolve("harshit")).to.equal(alice.address);
    expect(await registry.reverseResolve(alice.address)).to.equal("harshit");
  });

  it("rejects a username that's already taken", async function () {
    const { registry, alice, bob } = await deployFixture();
    await registry.connect(alice).register("harshit");

    await expect(registry.connect(bob).register("harshit")).to.be.revertedWith("username already registered");
  });

  it("rejects an address registering a second username", async function () {
    const { registry, alice } = await deployFixture();
    await registry.connect(alice).register("harshit");

    await expect(registry.connect(alice).register("harshit2")).to.be.revertedWith(
      "address already owns a username"
    );
  });

  it("rejects usernames that are too short or too long", async function () {
    const { registry, alice } = await deployFixture();

    await expect(registry.connect(alice).register("ab")).to.be.revertedWith("username must be 3-32 characters");
    await expect(registry.connect(alice).register("a".repeat(33))).to.be.revertedWith(
      "username must be 3-32 characters"
    );
  });

  it("rejects invalid characters", async function () {
    const { registry, alice } = await deployFixture();

    await expect(registry.connect(alice).register("Harshit")).to.be.revertedWith(
      "username may only contain a-z, 0-9, and hyphens"
    );
    await expect(registry.connect(alice).register("harshit_2007")).to.be.revertedWith(
      "username may only contain a-z, 0-9, and hyphens"
    );
  });

  it("allows hyphens and digits", async function () {
    const { registry, alice } = await deployFixture();
    await expect(registry.connect(alice).register("harshit-2007")).to.not.be.reverted;
  });

  it("returns address(0) and empty string for unregistered lookups", async function () {
    const { registry } = await deployFixture();
    expect(await registry.resolve("nobody")).to.equal(ethers.ZeroAddress);
    const [, , someone] = await ethers.getSigners();
    expect(await registry.reverseResolve(someone.address)).to.equal("");
  });
});