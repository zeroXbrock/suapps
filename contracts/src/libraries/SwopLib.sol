// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/* SWOP
Swap
WithOut
Permission
*/

import {Suave} from "suave/libraries/Suave.sol";

library UniV2Swop {
    address constant router = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    /// Returns market price sans fees.
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public view returns (uint256 price) {
        bytes memory result = Suave.ethcall(
            router,
            abi.encodeWithSignature(
                "getAmountOut(uint256,uint256,uint256)",
                amountIn,
                reserveIn,
                reserveOut
            )
        );
        (price) = abi.decode(result, (uint256));
    }

    // function uniswapV2Quote(
    //     uint256 amountA,
    //     uint256 reserveA,
    //     uint256 reserveB
    // ) returns (uint256 amountB) {
    //     Suave.ethcall(router, input1);
    // }
}
