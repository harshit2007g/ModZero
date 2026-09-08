// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PostRegistry
/// @notice A permissionless subreddit-style post registry. Anyone can
///         stake ETH to publish a post (text + optional image). If an
///         image is present, its contentId should already be registered
///         via ContentRegistry — this contract does not duplicate that
///         pipeline, it just references it.
contract PostRegistry is ReentrancyGuard, Ownable {
    struct Post {
        address creator;
        bytes32 textHash;      // keccak256 of the post's text — tamper-evidence, not full provenance
        bytes32 contentId;     // 0x0 if the post has no image; otherwise a ContentRegistry contentId
        uint256 stake;
        uint64 createdAt;
        bool exists;
    }

    uint256 public minPostStake;

    mapping(bytes32 => Post) public posts;

    event PostCreated(
        bytes32 indexed postId,
        address indexed creator,
        bytes32 textHash,
        bytes32 contentId,
        uint256 stake
    );

    constructor(uint256 _minPostStake) Ownable(msg.sender) {
        minPostStake = _minPostStake;
    }

    /// @param contentId Pass bytes32(0) if this post has no image.
    function createPost(bytes32 postId, bytes32 textHash, bytes32 contentId) external payable nonReentrant {
        require(!posts[postId].exists, "post already exists");
        require(msg.value >= minPostStake, "insufficient stake");

        posts[postId] = Post({
            creator: msg.sender,
            textHash: textHash,
            contentId: contentId,
            stake: msg.value,
            createdAt: uint64(block.timestamp),
            exists: true
        });

        emit PostCreated(postId, msg.sender, textHash, contentId, msg.value);
    }

    function getPost(bytes32 postId) external view returns (Post memory) {
        require(posts[postId].exists, "post not found");
        return posts[postId];
    }

    function setMinPostStake(uint256 _minPostStake) external onlyOwner {
        minPostStake = _minPostStake;
    }
}