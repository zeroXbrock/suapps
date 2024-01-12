// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge/StdAssertions.sol";
import "forge/Test.sol";
import "forge/console2.sol";

import "./HexEncoder.sol";

contract HexEncoderTest is Test {
    function testEncodeUint() public {
        uint256 x = 0x12345678;
        string memory s = HexEncoder.toHexString(x);
        assertEq(s, "12345678");
    }

    function testEncodeBytes32() public {
        bytes32 x = bytes32(
            0x0000000050607080901011012013014015016017018019020210220230240256
        );
        string memory s = HexEncoder.toHexString(x);
        assertEq(s, "50607080901011012013014015016017018019020210220230240256");
    }
}
