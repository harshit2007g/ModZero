// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ContentRegistry
/// @notice Ethereum-side economic layer for ModZero content registration.
/// @dev Stores commitments + stakes only. Media lives off-chain (IPFS).
///      Ordered provenance events live on Hedera HCS, not here.
///      See docs/SPEC.md sections 8, 9, 12, 24.
contract ContentRegistry is ReentrancyGuard, Ownable {
    struct Content {
        address creator;
        bytes32 commitment;      // Hash(secret || fingerprint || contentId || metadata)
        bytes32 parentContentId; // 0x0 if root content
        uint256 stake;
        uint64 registeredAt;
        bool exists;
    }

    /// @dev Minimum ETH required to register content. Configurable, not hard-coded
    ///      per spec section 24 — adjustable via governance/owner for MVP.
    uint256 public minStake;

    mapping(bytes32 => Content) public contents; // contentId => Content

    event ContentRegistered(
        bytes32 indexed contentId,
        address indexed creator,
        bytes32 commitment,
        bytes32 parentContentId,
        uint256 stake
    );

    event StakeWithdrawn(bytes32 indexed contentId, address indexed creator, uint256 amount);

    constructor(uint256 _minStake) Ownable(msg.sender) {
        minStake = _minStake;
    }

    /// @notice Register root or derivative content with a stake.
    /// @param contentId Application-level content identifier (spec §9).
    /// @param commitment Hash(secret || fingerprint || contentId || metadata) (spec §12).
    /// @param parentContentId 0x0 for root content, otherwise the parent's contentId.
    function registerContent(
        bytes32 contentId,
        bytes32 commitment,
        bytes32 parentContentId
    ) external payable nonReentrant {
        require(!contents[contentId].exists, "content already registered");
        require(msg.value >= minStake, "insufficient stake");

        contents[contentId] = Content({
            creator: msg.sender,
            commitment: commitment,
            parentContentId: parentContentId,
            stake: msg.value,
            registeredAt: uint64(block.timestamp),
            exists: true
        });

        emit ContentRegistered(contentId, msg.sender, commitment, parentContentId, msg.value);
    }

    function getContent(bytes32 contentId) external view returns (Content memory) {
        require(contents[contentId].exists, "content not found");
        return contents[contentId];
    }

    /// @dev Slashing/withdrawal logic is intentionally NOT implemented here yet.
    ///      Per spec §27, a creator must not receive another user's stake merely
    ///      because a license request was rejected — slashing must be tied to
    ///      resolved claims only. This will be wired to ClaimRegistry.
    function setMinStake(uint256 _minStake) external onlyOwner {
        minStake = _minStake;
    }
}
