// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge/StdAssertions.sol";
import "forge/Test.sol";
import "forge/console2.sol";
import {UniV2Swop, SwapExactTokensForTokensRequest, TxMeta} from "./SwopLib.sol";
import {HexEncoder} from "../util/HexEncoder.sol";
import {SuaveEnabled} from "suavestd/Test.sol";

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
        console2.log(
            "privateKey: %s",
            HexEncoder.toHexString(privateKey, false)
        );
        TxMeta memory txMeta = TxMeta({
            chainId: 5,
            gas: 100000,
            gasPrice: 1000000000,
            nonce: 0
        });
        console2.log("chainId: %d", txMeta.chainId);
        (bytes memory signedTx, bytes memory data) = UniV2Swop
            .swapExactTokensForTokens(request, privateKey, txMeta);
        console2.log(
            "signedTx: %s",
            HexEncoder.toHexString(signedTx, false, true)
        );
        console2.log("data: %s", HexEncoder.toHexString(data, false, true));
        // TODO: be more assertive
    }
}
