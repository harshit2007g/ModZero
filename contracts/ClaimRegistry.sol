// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IContentRegistry.sol";

/// @title ClaimRegistry
/// @notice Deterministic, protocol-enforced evidence pipeline for
///         unauthorized-use claims (spec §25-28). On a RESOLVED_VALID
///         outcome, this contract slashes the accused content's stake
///         (held in ContentRegistry) and sends it to the claimant —
///         actual economic settlement, not just a state change.
contract ClaimRegistry is ReentrancyGuard {
    enum ClaimState {
        NONE,
        CREATED,
        EVIDENCE_SUBMITTED,
        RESOLVED_VALID,
        RESOLVED_INVALID
    }

    struct Claim {
        bytes32 contentId;
        bytes32 rootContentId;
        address claimant;
        address subject;
        bytes32 evidenceHash;
        ClaimState state;
        uint64 createdAt;
    }

    IContentRegistry public immutable contentRegistry;

    mapping(bytes32 => Claim) public claims;

    event ClaimCreated(
        bytes32 indexed claimId,
        bytes32 indexed contentId,
        bytes32 indexed rootContentId,
        address claimant,
        address subject,
        bytes32 evidenceHash
    );

    event ClaimResolved(bytes32 indexed claimId, ClaimState outcome, uint256 slashedAmount);

    constructor(address _contentRegistry) {
        contentRegistry = IContentRegistry(_contentRegistry);
    }

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

    /// @notice Resolves a claim. On RESOLVED_VALID, slashes the accused
    ///         content's stake (in ContentRegistry) to the claimant. The
    ///         accused content must have been registered with a stake —
    ///         if it has none (e.g. already slashed, or never had one),
    ///         this reverts rather than silently resolving with no
    ///         settlement (spec §38 Rule 3: don't silently change
    ///         economic outcomes).
    function resolveClaim(bytes32 claimId, ClaimState outcome) external nonReentrant {
        require(
            outcome == ClaimState.RESOLVED_VALID || outcome == ClaimState.RESOLVED_INVALID,
            "invalid outcome"
        );
        Claim storage c = claims[claimId];
        require(c.state == ClaimState.CREATED || c.state == ClaimState.EVIDENCE_SUBMITTED, "bad state");

        c.state = outcome;

        uint256 slashedAmount = 0;
        if (outcome == ClaimState.RESOLVED_VALID) {
            slashedAmount = contentRegistry.slashStake(c.contentId, payable(c.claimant));
        }

        emit ClaimResolved(claimId, outcome, slashedAmount);
    }
}