// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge/StdAssertions.sol";
import "forge/Test.sol";
import "forge/console2.sol";
import {UniV2Swop, SwapExactTokensForTokensRequest, TxMeta} from "./SwopLib.sol";
import {HexEncoder} from "../util/HexEncoder.sol";
import {SuaveEnabled} from "suavestd/Test.sol";
import {Suave} from "suavestd/suavelib/Suave.sol";

contract SwopLibTest is Test, SuaveEnabled {
    function getTimestampSeconds() public returns (uint256) {
        uint256 ms = vm.unixTime();
        return ms / 1000;
    }

    function testTimestamp() public {
        uint256 timestamp = getTimestampSeconds();
        console.log("timestamp: %d", timestamp);
        // note: when executed in the past, this test will fail
        assert(timestamp > 1705098666);
    }

    function testGetAmountOut() public {
        uint256 amountIn = 0x69696969;
        uint256 reserveIn = 0x42424242424242;
        uint256 reserveOut = 0x131313131313131313131313;
        uint256 amountOut = UniV2Swop.getAmountOut(
            amountIn,
            reserveIn,
            reserveOut
        );
        console2.log("amountOut: %d", amountOut);
        assertEq(amountOut, 558102013055677511204);
    }

    function testSwapExactTokensForTokens() public {
        SwapExactTokensForTokensRequest
            memory request = SwapExactTokensForTokensRequest({
                amountIn: 100,
                amountOutMin: 120,
                path: new address[](2),
                to: address(0x420),
                deadline: getTimestampSeconds() + 3600
            });
        bytes32 privateKey = keccak256(abi.encodePacked(uint32(0xf331900d)));
        TxMeta memory txMeta = TxMeta({
            chainId: 5,
            gas: 100000,
            gasPrice: 1000000000,
            nonce: 0
        });
        (bytes memory signedTx, bytes memory data) = UniV2Swop
            .swapExactTokensForTokens(request, privateKey, txMeta);
        console2.log(
            "signedTx: %s",
            HexEncoder.toHexString(signedTx, false, true)
        );
        assertEq(signedTx.length, 365);
        assertEq(data.length, 260);
        assert(bytes32(signedTx) == 0xf9016a80843b9aca00830186a0947a250d5630b4cf539739df2c5dacb4c659f2);
    }
}
