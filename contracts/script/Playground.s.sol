// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {UniV2Swop} from "../src/libraries/SwopLib.sol";

// TODO: add SuaveEnabled
contract PlaygroundScript is Script {
    function setUp() public pure {
        console2.log(
            "gonna try to call univ2 router on ethereum with this calldata:"
        );
        bytes memory data = abi.encodeWithSignature(
            "getAmountOut(uint256,uint256,uint256)",
            [1 ether, 100 ether, 42000 ether]
        );
        console2.logBytes(data);
        console2.log(
            "the Suave lib's ethcall function is gonna abi-encode our data again:"
        );
        console2.logBytes(
            abi.encode(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, data)
        );
    }

    function run() public {
        vm.broadcast();
        // uint256 price = UniV2Swop.getAmountOut(1 ether, 100 ether, 42000 ether);
        // console2.log(price);
        address payable router = payable(UniV2Swop.router);
        console2.log(router);
        router.transfer(1 ether);
    }
}
