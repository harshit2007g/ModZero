import { expect } from "chai";
import { ethers } from "hardhat";
import { LicenseRegistry } from "../typechain-types";

describe("LicenseRegistry", function () {
  async function deployFixture() {
    const [licensor, licensee, attacker] = await ethers.getSigners();
    const LicenseRegistry = await ethers.getContractFactory("LicenseRegistry");
    const registry = (await LicenseRegistry.deploy()) as unknown as LicenseRegistry;
    await registry.waitForDeployment();
    return { registry, licensor, licensee, attacker };
  }

  function makeIds() {
    const contentA = ethers.keccak256(ethers.toUtf8Bytes("content-a"));
    const contentB = ethers.keccak256(ethers.toUtf8Bytes("content-b"));
    const termsHash = ethers.keccak256(ethers.toUtf8Bytes("commercial;no-mod;attribution"));
    const licenseId = ethers.keccak256(ethers.toUtf8Bytes("license-1"));
    const revertId = ethers.ZeroHash;
    return { contentA, contentB, termsHash, licenseId, revertId };
  }

  it("lets the licensor issue a content-specific license for a specific licensee", async function () {
    const { registry, licensor, licensee } = await deployFixture();
    const { contentA, termsHash, licenseId } = makeIds();

    await expect(
      registry.connect(licensor).issueLicense(licenseId, contentA, licensor.address, licensee.address, termsHash, 0)
    )
      .to.emit(registry, "LicenseIssued")
      .withArgs(licenseId, contentA, licensor.address, licensee.address, termsHash, 0);

    const lic = await registry.licenses(licenseId);
    expect(lic.contentId).to.equal(contentA);
    expect(lic.licensor).to.equal(licensor.address);
    expect(lic.licensee).to.equal(licensee.address);
    expect(lic.termsHash).to.equal(termsHash);
    expect(lic.exists).to.equal(true);

    // hasValidLicense is pair-keyed: the exact (contentId, licensee) pair
    // flips true; every other combination stays false.
    expect(await registry.hasValidLicense(contentA, licensee.address)).to.equal(true);
  });

  it("does NOT grant the licensee a license for any other content", async function () {
    const { registry, licensor, licensee } = await deployFixture();
    const { contentA, contentB, termsHash, licenseId } = makeIds();

    await registry.connect(licensor).issueLicense(licenseId, contentA, licensor.address, licensee.address, termsHash, 0);

    expect(await registry.hasValidLicense(contentA, licensee.address)).to.equal(true);
    expect(await registry.hasValidLicense(contentB, licensee.address)).to.equal(false);
    expect(await registry.hasValidLicense(contentA, licensor.address)).to.equal(false);
    expect(await registry.hasValidLicense(contentA, ethers.ZeroAddress)).to.equal(false);
  });

  it("rejects issuance from anyone other than the licensor", async function () {
    const { registry, licensor, licensee, attacker } = await deployFixture();
    const { contentA, termsHash, licenseId } = makeIds();

    // attacker tries to forge a license claiming the real licensor issued it
    await expect(
      registry.connect(attacker).issueLicense(licenseId, contentA, licensor.address, licensee.address, termsHash, 0)
    ).to.be.revertedWith("only the licensor can issue");

    // attacker can only act as themselves; a self-issued record touches only
    // their own pair and never the real licensor's / licensee's slots.
    const attackerLicense = ethers.keccak256(ethers.toUtf8Bytes("attacker-license"));
    await registry
      .connect(attacker)
      .issueLicense(attackerLicense, contentA, attacker.address, attacker.address, termsHash, 0);

    expect(await registry.activeLicenseOf(contentA, licensee.address)).to.equal(ethers.ZeroHash);
    expect(await registry.hasValidLicense(contentA, licensee.address)).to.equal(false);
    // self-issued record is attributable (licensor == licensee == attacker)
    expect(await registry.hasValidLicense(contentA, attacker.address)).to.equal(true);
  });

  it("rejects a duplicate licenseId", async function () {
    const { registry, licensor, licensee } = await deployFixture();
    const { contentA, termsHash, licenseId } = makeIds();

    await registry.connect(licensor).issueLicense(licenseId, contentA, licensor.address, licensee.address, termsHash, 0);

    await expect(
      registry.connect(licensor).issueLicense(licenseId, contentA, licensor.address, licensee.address, termsHash, 0)
    ).to.be.revertedWith("license already exists");
  });

  it("returns false for unset pairs and respects expiry", async function () {
    const { registry, licensor, licensee } = await deployFixture();
    const { contentA, termsHash, licenseId } = makeIds();

    expect(await registry.hasValidLicense(contentA, licensee.address)).to.equal(false);

    // expired license → invalid even though the pair is set
    const expired = 10n; // block.timestamp in tests is far later than this
    await registry.connect(licensor).issueLicense(licenseId, contentA, licensor.address, licensee.address, termsHash, expired);
    expect(await registry.hasValidLicense(contentA, licensee.address)).to.equal(false);
  });
});