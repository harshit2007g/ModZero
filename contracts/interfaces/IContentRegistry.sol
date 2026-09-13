// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IContentRegistry {
    function slashStake(bytes32 contentId, address payable recipient) external returns (uint256);

    function getContent(bytes32 contentId)
        external
        view
        returns (
            address creator,
            bytes32 commitment,
            bytes32 parentContentId,
            uint256 stake,
            uint64 registeredAt,
            bool exists
        );
}