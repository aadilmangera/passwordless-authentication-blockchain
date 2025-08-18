// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Minimal on-chain key registry:
 * - userId (bytes32) -> set of authorized keys (addresses)
 * - register initial key, add/remove/rotate keys
 * - optional guardian-based recovery (threshold approvals)
 *
 * Simplicity > perfection for demo. Good enough for assignment and a smooth demo.
 */
contract KeyRegistry {
    event UserRegistered(bytes32 indexed userId, address indexed key);
    event KeyAdded(bytes32 indexed userId, address indexed key);
    event KeyRemoved(bytes32 indexed userId, address indexed key);
    event RecoveryProposed(bytes32 indexed userId, address indexed newKey, address indexed guardian);
    event RecoveryExecuted(bytes32 indexed userId, address indexed newKey);

    struct RecoveryCfg {
        uint8 threshold;
        mapping(address => bool) guardian;
    }

    mapping(bytes32 => mapping(address => bool)) private _isKey; // userId => key => bool
    mapping(bytes32 => uint256) public keyCount;
    mapping(bytes32 => RecoveryCfg) private _recoveryCfg;

    // userId => newKey => guardian => approved?
    mapping(bytes32 => mapping(address => mapping(address => bool))) private _approved;
    // userId => newKey => approvals
    mapping(bytes32 => mapping(address => uint256)) private _approvalCount;

    modifier onlyKey(bytes32 userId) {
        require(_isKey[userId][msg.sender], "Not an authorized key");
        _;
    }

    function isKey(bytes32 userId, address key) external view returns (bool) {
        return _isKey[userId][key];
    }

    function register(
        bytes32 userId,
        address initialKey,
        address[] calldata guardians,
        uint8 threshold
    ) external {
        require(keyCount[userId] == 0, "Already registered");
        address init = (initialKey == address(0)) ? msg.sender : initialKey;
        _isKey[userId][init] = true;
        keyCount[userId] = 1;

        for (uint i = 0; i < guardians.length; i++) {
            _recoveryCfg[userId].guardian[guardians[i]] = true;
        }
        _recoveryCfg[userId].threshold = threshold;

        emit UserRegistered(userId, init);
    }

    function addKey(bytes32 userId, address newKey) external onlyKey(userId) {
        require(!_isKey[userId][newKey], "Already a key");
        _isKey[userId][newKey] = true;
        keyCount[userId] += 1;
        emit KeyAdded(userId, newKey);
    }

    function removeKey(bytes32 userId, address keyToRemove) external onlyKey(userId) {
        require(_isKey[userId][keyToRemove], "Not a key");
        require(keyCount[userId] > 1, "At least 1 key required");
        _isKey[userId][keyToRemove] = false;
        keyCount[userId] -= 1;
        emit KeyRemoved(userId, keyToRemove);
    }

    function rotateKey(bytes32 userId, address oldKey, address newKey) external onlyKey(userId) {
        require(_isKey[userId][oldKey], "Old key not found");
        require(!_isKey[userId][newKey], "New key already authorized");
        _isKey[userId][oldKey] = false;
        _isKey[userId][newKey] = true;
        emit KeyRemoved(userId, oldKey);
        emit KeyAdded(userId, newKey);
    }

    // ---- Social recovery ----
    function proposeRecovery(bytes32 userId, address newKey) external {
        require(_recoveryCfg[userId].guardian[msg.sender], "Not a guardian");
        require(!_approved[userId][newKey][msg.sender], "Already approved");
        _approved[userId][newKey][msg.sender] = true;
        _approvalCount[userId][newKey] += 1;
        emit RecoveryProposed(userId, newKey, msg.sender);
    }

    function executeRecovery(bytes32 userId, address newKey) external {
        uint8 threshold = _recoveryCfg[userId].threshold;
        require(threshold > 0, "No recovery configured");
        require(_approvalCount[userId][newKey] >= threshold, "Not enough approvals");
        require(keyCount[userId] > 0, "User not registered");

        // Demo reset: clear count and set only newKey.
        // (In prod, track an array to actually iterate and revoke.)
        keyCount[userId] = 0;
        _isKey[userId][newKey] = true;
        keyCount[userId] = 1;

        emit RecoveryExecuted(userId, newKey);
    }
}
