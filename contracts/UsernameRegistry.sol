// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title UsernameRegistry
/// @notice Minimal on-chain identity layer: maps a human-readable
///         username to a wallet address, and back. This is the MVP
///         phase only — no fees, expiration, transfers, or agent/payment
///         metadata. Those are intentionally deferred (see project docs)
///         to keep this scoped and shippable.
contract UsernameRegistry {
    mapping(string => address) public usernameToOwner;
    mapping(address => string) public ownerToUsername;

    event UsernameRegistered(string username, address indexed owner);

    /// @notice Registers `username` to the caller's address. Reverts if
    ///         the name is taken, or if the caller already owns a
    ///         different username (one name per address, MVP simplicity).
    function register(string calldata username) external {
        require(bytes(username).length >= 3 && bytes(username).length <= 32, "username must be 3-32 characters");
        require(_isValidFormat(username), "username may only contain a-z, 0-9, and hyphens");
        require(usernameToOwner[username] == address(0), "username already registered");
        require(bytes(ownerToUsername[msg.sender]).length == 0, "address already owns a username");

        usernameToOwner[username] = msg.sender;
        ownerToUsername[msg.sender] = username;

        emit UsernameRegistered(username, msg.sender);
    }

    /// @notice Forward resolution: username -> address. Returns
    ///         address(0) if unregistered.
    function resolve(string calldata username) external view returns (address) {
        return usernameToOwner[username];
    }

    /// @notice Reverse resolution: address -> username. Returns an empty
    ///         string if the address hasn't registered one.
    function reverseResolve(address owner) external view returns (string memory) {
        return ownerToUsername[owner];
    }

    /// @dev Lowercase a-z, 0-9, and hyphens only. Case is NOT
    ///      auto-normalized on-chain (that's a frontend/backend
    ///      responsibility per the design doc) — callers must submit
    ///      already-lowercased input, or registration reverts.
    function _isValidFormat(string calldata username) private pure returns (bool) {
        bytes memory b = bytes(username);
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 char = b[i];
            bool isLower = char >= 0x61 && char <= 0x7A; // a-z
            bool isDigit = char >= 0x30 && char <= 0x39; // 0-9
            bool isHyphen = char == 0x2D; // -
            if (!isLower && !isDigit && !isHyphen) return false;
        }
        return true;
    }
}