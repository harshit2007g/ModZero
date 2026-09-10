// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IContentRegistry {
    function slashStake(bytes32 contentId, address payable recipient) external returns (uint256);
}