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

    function testSwapExactTokensForTokens() public view {
        SwapExactTokensForTokensRequest
            memory request = SwapExactTokensForTokensRequest({
                amountIn: 100,
                amountOutMin: 0,
                path: new address[](2),
                to: address(0x420),
                deadline: 0
            });
        bytes32 privateKey = keccak256(abi.encodePacked(uint32(0xf331900d)));
        console2.log("privateKey: %s", HexEncoder.toHexString(privateKey));
        TxMeta memory txMeta = TxMeta({
            chainId: 1,
            gas: 100000,
            gasPrice: 1000000000,
            nonce: 0
        });
        (bytes memory signedTx, bytes memory data) = UniV2Swop
            .swapExactTokensForTokens(request, privateKey, txMeta);
        // TODO: be more assertive
    }
}
