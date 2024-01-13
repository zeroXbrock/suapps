// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge/StdAssertions.sol";
import "forge/Test.sol";
import "forge/console2.sol";

import "./HexEncoder.sol";

contract HexEncoderTest is Test {
    function testEncodeUint() public {
        uint256 x = 0x12345678;

        string memory s = HexEncoder.toHexString(x, false);
        assertEq(
            s,
            "0000000000000000000000000000000000000000000000000000000012345678"
        );

        s = HexEncoder.toHexString(x, true);
        assertEq(s, "12345678");

        s = HexEncoder.toHexString(x, true, true);
        assertEq(s, "0x12345678");
    }

    function testEncodeBytes32() public {
        bytes32 x = bytes32(
            0x0000000050607080901011012013014015016017018019020210220230240256
        );

        string memory s = HexEncoder.toHexString(x, false);
        assertEq(
            s,
            "0000000050607080901011012013014015016017018019020210220230240256"
        );

        s = HexEncoder.toHexString(x, true);
        assertEq(s, "50607080901011012013014015016017018019020210220230240256");

        s = HexEncoder.toHexString(x, true, true);
        assertEq(
            s,
            "0x50607080901011012013014015016017018019020210220230240256"
        );
    }

    function testEncodeBytes() public {
        bytes memory x = abi.encode(1, 2, 3, 4, 5, 6, 7, 8, 9);

        string memory s = HexEncoder.toHexString(x, false);
        assertEq(
            s,
            "000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000700000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000009"
        );

        s = HexEncoder.toHexString(x, true);
        assertEq(
            s,
            "100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000700000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000009"
        );

        s = HexEncoder.toHexString(x, true, true);
        assertEq(
            s,
            "0x100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000700000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000009"
        );
    }
}
