// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/* SWOP
Swap
WithOut
Permission
*/

// import {Suave} from "suave/libraries/Suave.sol";
import {Suave} from "suavestd/suavelib/Suave.sol";
import {Transactions} from "suavestd/Transactions.sol";
import {HexEncoder} from "../util/HexEncoder.sol";

struct SwapExactTokensForTokensRequest {
    uint256 amountIn;
    uint256 amountOutMin;
    address[] path;
    address to;
    uint256 deadline;
}

library UniV2Swop {
    address public constant router = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

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

    /// Swap tokens on Uniswap V2. Returns raw signed tx, which can be broadcasted.
    /// txMeta must contain chainId, gas, gasPrice, and nonce.
    function swapExactTokensForTokens(
        // uint256 amountIn,
        // uint256 amountOutMin,
        // address[] calldata path,
        // address to,
        // uint256 deadline,
        SwapExactTokensForTokensRequest calldata request,
        bytes32 privateKey,
        Transactions.Legacy calldata txMeta
    ) public view returns (bytes memory signedTx, bytes memory data) {
        data = abi.encodeWithSignature(
            "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
            request.amountIn,
            request.amountOutMin,
            request.path,
            request.to,
            request.deadline
        );
        Transactions.Legacy memory txStruct = Transactions.Legacy({
            to: router,
            gas: txMeta.gas,
            gasPrice: txMeta.gasPrice,
            value: 0,
            nonce: txMeta.nonce,
            data: data,
            chainId: txMeta.chainId,
            r: abi.encodePacked(bytes32(0)),
            s: abi.encodePacked(bytes32(0)),
            v: abi.encodePacked(bytes32(0))
        });
        bytes memory rlpTx = Transactions.encodeRLP(txStruct);
        signedTx = Suave.signEthTransaction(
            rlpTx,
            HexEncoder.toHexString(uint256(txMeta.chainId)),
            HexEncoder.toHexString(privateKey)
        );
    }
}
