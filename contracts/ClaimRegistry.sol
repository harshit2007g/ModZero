// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ClaimRegistry
/// @notice Deterministic, protocol-enforced evidence pipeline for
///         unauthorized-use claims (spec §25-28). This is explicitly NOT a
///         full legal arbitration system — see spec §26, §29.
contract ClaimRegistry is ReentrancyGuard {
    enum ClaimState {
        NONE,
        CREATED,
        EVIDENCE_SUBMITTED,
        RESOLVED_VALID,
        RESOLVED_INVALID
    }

    struct Claim {
        bytes32 contentId;      // the allegedly unauthorized content
        bytes32 rootContentId;  // the original registered content
        address claimant;
        address subject;
        bytes32 evidenceHash;   // hash of off-chain evidence bundle (fingerprint + watermark match data)
        ClaimState state;
        uint64 createdAt;
    }

    mapping(bytes32 => Claim) public claims; // claimId => Claim

    event ClaimCreated(
        bytes32 indexed claimId,
        bytes32 indexed contentId,
        bytes32 indexed rootContentId,
        address claimant,
        address subject,
        bytes32 evidenceHash
    );

    event ClaimResolved(bytes32 indexed claimId, ClaimState outcome);

    /// @notice Create a claim. Per spec §28, this alone proves nothing —
    ///         it only opens the evidence pipeline. A creator's assertion
    ///         does NOT automatically win.
    function createClaim(
        bytes32 claimId,
        bytes32 contentId,
        bytes32 rootContentId,
        address subject,
        bytes32 evidenceHash
    ) external {
        require(claims[claimId].state == ClaimState.NONE, "claim already exists");

        claims[claimId] = Claim({
            contentId: contentId,
            rootContentId: rootContentId,
            claimant: msg.sender,
            subject: subject,
            evidenceHash: evidenceHash,
            state: ClaimState.CREATED,
            createdAt: uint64(block.timestamp)
        });

        emit ClaimCreated(claimId, contentId, rootContentId, msg.sender, subject, evidenceHash);
    }

    /// @dev Resolution logic intentionally left as a stub. The MVP rule per
    ///      spec §26 is roughly:
    ///        IF provenance evidence valid AND no valid license AND claim
    ///        satisfies protocol requirements THEN RESOLVED_VALID
    ///      This needs to cross-check LicenseRegistry.hasValidLicense() and
    ///      the off-chain fingerprint/watermark verification result before
    ///      being callable — do not wire this up without that check in place.
    function resolveClaim(bytes32 claimId, ClaimState outcome) external nonReentrant {
        require(
            outcome == ClaimState.RESOLVED_VALID || outcome == ClaimState.RESOLVED_INVALID,
            "invalid outcome"
        );
        Claim storage c = claims[claimId];
        require(c.state == ClaimState.CREATED || c.state == ClaimState.EVIDENCE_SUBMITTED, "bad state");

        c.state = outcome;
        emit ClaimResolved(claimId, outcome);

        // TODO: economic settlement (slashing ContentRegistry stake, etc.)
        // must be implemented as an explicit, reviewed step per spec §37 —
        // not silently added here (spec §38 Rule 3: do not silently change
        // economic rules).
    }
}
