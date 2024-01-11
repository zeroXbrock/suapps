// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library HexEncoder {
    function toHexString(bytes32 value) internal pure returns (string memory) {
        bytes memory result = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            bytes1 byteValue = value[i];
            result[i * 2] = _hexChar(uint8(byteValue) / 16);
            result[i * 2 + 1] = _hexChar(uint8(byteValue) % 16);
        }
        return string(result);
    }

    function toHexString(
        bytes memory value
    ) internal pure returns (string memory) {
        bytes memory result = new bytes(value.length * 2);
        for (uint256 i = 0; i < value.length; i++) {
            bytes1 byteValue = value[i];
            result[i * 2] = _hexChar(uint8(byteValue) / 16);
            result[i * 2 + 1] = _hexChar(uint8(byteValue) % 16);
        }
        return string(result);
    }

    function toHexString(uint256 value) internal pure returns (string memory) {
        bytes memory result = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            bytes1 byteValue = bytes1(uint8(value / (2 ** (8 * (31 - i)))));
            result[i * 2] = _hexChar(uint8(byteValue) / 16);
            result[i * 2 + 1] = _hexChar(uint8(byteValue) % 16);
        }
        return string(result);
    }

    function _hexChar(uint8 value) internal pure returns (bytes1) {
        if (value < 10) {
            return bytes1(uint8(bytes1("0")) + value);
        } else {
            return bytes1(uint8(bytes1("a")) + (value - 10));
        }
    }
}
