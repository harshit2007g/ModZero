// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title LicenseRegistry
/// @notice Records issued licenses as protocol objects (spec §21).
/// @dev Payment verification (x402) happens off-chain in the creator agent;
///      this contract only records the resulting license commitment on-chain
///      so it can be checked during claim resolution.
contract LicenseRegistry {
    struct License {
        bytes32 contentId;
        address licensor;
        address licensee;
        bytes32 termsHash;     // deterministic hash of machine-readable terms (spec §18, §21)
        uint64 issuedAt;
        uint64 expiresAt;      // 0 = no expiry
        bool exists;
    }

    mapping(bytes32 => License) public licenses; // licenseId => License

    /// @dev contentId => licensee => licenseId, for quick "does Bob have a
    ///      valid license for this content" lookups during claim checks.
    mapping(bytes32 => mapping(address => bytes32)) public activeLicenseOf;

    event LicenseIssued(
        bytes32 indexed licenseId,
        bytes32 indexed contentId,
        address indexed licensor,
        address licensee,
        bytes32 termsHash,
        uint64 expiresAt
    );

    /// @notice Called by the licensor (or an authorized agent relay) once
    ///         x402 payment has been independently verified off-chain.
    function issueLicense(
        bytes32 licenseId,
        bytes32 contentId,
        address licensor,
        address licensee,
        bytes32 termsHash,
        uint64 expiresAt
    ) external {
        require(!licenses[licenseId].exists, "license already exists");
        // NOTE: access control TBD — likely restricted to the registered
        // content's creator (via ContentRegistry) or a trusted agent relay.
        // Left open here intentionally; do not assume final auth model.

        licenses[licenseId] = License({
            contentId: contentId,
            licensor: licensor,
            licensee: licensee,
            termsHash: termsHash,
            issuedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            exists: true
        });

        activeLicenseOf[contentId][licensee] = licenseId;

        emit LicenseIssued(licenseId, contentId, licensor, licensee, termsHash, expiresAt);
    }

    function hasValidLicense(bytes32 contentId, address user) external view returns (bool) {
        bytes32 licenseId = activeLicenseOf[contentId][user];
        if (licenseId == bytes32(0)) return false;
        License memory lic = licenses[licenseId];
        if (!lic.exists) return false;
        if (lic.expiresAt != 0 && lic.expiresAt < block.timestamp) return false;
        return true;
    }
}
