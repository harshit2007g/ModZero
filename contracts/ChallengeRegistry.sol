// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ChallengeRegistry
/// @notice Permissionless, community-voted challenges against posts.
///         No moderator decides guilt — token-weighted-by-nothing (one
///         address, one vote, deliberately simple for MVP) community
///         consensus does, within a fixed voting window. A guilty verdict
///         costs the creator reputation, which downranks future posts —
///         it does NOT delete anything.
contract ChallengeRegistry is ReentrancyGuard {
    enum ChallengeState {
        NONE,
        VOTING,
        RESOLVED_GUILTY,
        RESOLVED_NOT_GUILTY
    }

    struct Challenge {
        bytes32 postId;
        address challenger;
        address creator;
        uint256 challengerStake;
        uint64 votingDeadline;
        uint256 votesGuilty;
        uint256 votesNotGuilty;
        ChallengeState state;
    }

    uint256 public minChallengeStake;
    uint64 public votingPeriod; // seconds
    uint256 public minQuorum; // minimum total votes required to resolve
    int256 public constant REPUTATION_PENALTY = 10;
    int256 public constant REPUTATION_BASELINE = 100;

    mapping(bytes32 => Challenge) public challenges;
    mapping(bytes32 => mapping(address => bool)) public hasVoted;
    mapping(address => int256) public reputation; // 0 = uninitialized -> treated as REPUTATION_BASELINE

    event ChallengeCreated(
        bytes32 indexed challengeId,
        bytes32 indexed postId,
        address indexed challenger,
        address creator,
        uint256 challengerStake,
        uint64 votingDeadline
    );
    event VoteCast(bytes32 indexed challengeId, address indexed voter, bool guilty);
    event ChallengeResolved(bytes32 indexed challengeId, ChallengeState outcome, int256 newReputation);

    constructor(uint256 _minChallengeStake, uint64 _votingPeriod, uint256 _minQuorum) {
        minChallengeStake = _minChallengeStake;
        votingPeriod = _votingPeriod;
        minQuorum = _minQuorum;
    }

    function createChallenge(bytes32 challengeId, bytes32 postId, address creator) external payable nonReentrant {
        require(challenges[challengeId].state == ChallengeState.NONE, "challenge already exists");
        require(msg.value >= minChallengeStake, "insufficient challenger stake");

        challenges[challengeId] = Challenge({
            postId: postId,
            challenger: msg.sender,
            creator: creator,
            challengerStake: msg.value,
            votingDeadline: uint64(block.timestamp) + votingPeriod,
            votesGuilty: 0,
            votesNotGuilty: 0,
            state: ChallengeState.VOTING
        });

        emit ChallengeCreated(challengeId, postId, msg.sender, creator, msg.value, challenges[challengeId].votingDeadline);
    }

    /// @notice One address, one vote per challenge. Deliberately unweighted
    ///         for MVP — spec-equivalent note: a real system might weight
    ///         by stake or reputation, but that opens sybil/plutocracy
    ///         concerns that are out of scope to solve here.
    function vote(bytes32 challengeId, bool guilty) external {
        Challenge storage c = challenges[challengeId];
        require(c.state == ChallengeState.VOTING, "challenge not open for voting");
        require(block.timestamp < c.votingDeadline, "voting period has ended");
        require(!hasVoted[challengeId][msg.sender], "already voted");

        hasVoted[challengeId][msg.sender] = true;
        if (guilty) {
            c.votesGuilty += 1;
        } else {
            c.votesNotGuilty += 1;
        }

        emit VoteCast(challengeId, msg.sender, guilty);
    }

    /// @notice Permissionless — anyone can trigger resolution once the
    ///         voting window has closed. Requires quorum so a single
    ///         voter can't decide the outcome alone.
    function resolveChallenge(bytes32 challengeId) external nonReentrant {
        Challenge storage c = challenges[challengeId];
        require(c.state == ChallengeState.VOTING, "challenge not open");
        require(block.timestamp >= c.votingDeadline, "voting period not yet ended");

        uint256 totalVotes = c.votesGuilty + c.votesNotGuilty;
        require(totalVotes >= minQuorum, "quorum not reached");

        bool guilty = c.votesGuilty > c.votesNotGuilty;
        c.state = guilty ? ChallengeState.RESOLVED_GUILTY : ChallengeState.RESOLVED_NOT_GUILTY;

        if (guilty) {
            int256 current = reputation[c.creator] == 0 ? REPUTATION_BASELINE : reputation[c.creator];
            reputation[c.creator] = current - REPUTATION_PENALTY;
        }

        // TODO: stake settlement (challenger stake returned/slashed based on
        // outcome) is intentionally not implemented yet — same pattern as
        // ClaimRegistry.resolveClaim. Needs explicit, reviewed design before
        // real money moves (spec §37, AI Rule 3: don't silently change
        // economic rules).

        emit ChallengeResolved(challengeId, c.state, reputation[c.creator]);
    }

    function getReputation(address creator) external view returns (int256) {
        int256 rep = reputation[creator];
        return rep == 0 ? REPUTATION_BASELINE : rep;
    }
}