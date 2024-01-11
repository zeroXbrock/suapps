// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// import "suave/libraries/Suave.sol";
// import "suave/standard_peekers/bids.sol";
// import "./SuaveWallet.sol";
import {Suave} from "suavestd/suavelib/Suave.sol";
import {Transactions} from "suavestd/Transactions.sol";
import {UniV2Swop, SwapExactTokensForTokensRequest} from "./libraries/SwopLib.sol";
import {HexEncoder} from "./util/HexEncoder.sol";
import {Suave2} from "./util/Suave2.sol";

/// Limit order for a swap. Used as a simple example for intents delivery system.
struct LimitOrder {
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 amountOutMin;
    uint256 expiryTimestamp; // unix seconds
    // only available in confidentialInputs:
    address to;
    bytes32 senderKey;
}

/// A reduced version of the original limit order to be shared publicly.
struct LimitOrderPublic {
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 amountOutMin;
    uint256 expiryTimestamp;
}

contract Intents {
    // we probably shouldn't be storing intents in storage
    // TODO: make a stateless design
    mapping(bytes32 => LimitOrderPublic) public intentsPending;
    string public constant RPC_URL = "https://relay-goerli.flashbots.net";
    bytes2 public constant TX_PLACEHOLDER = 0xf00d;

    event Test(uint64 num);
    event LimitOrderReceived(
        bytes32 orderId,
        bytes16 dataId,
        address tokenIn,
        address tokenOut,
        uint256 expiryTimestamp,
        uint256 random
    );
    event IntentFulfilled(bytes32 orderId);

    fallback() external {
        emit Test(0x9001);
    }

    /// Returns the order ID used to look up a limit order.
    function getOrderId(
        LimitOrderPublic memory order
    ) internal pure returns (bytes32 orderId) {
        orderId = keccak256(
            abi.encode(
                order.tokenIn,
                order.tokenOut,
                order.amountIn,
                order.amountOutMin,
                order.expiryTimestamp
            )
        );
    }

    /// Returns ABI-encoded calldata of `onReceivedIntent(...)`.
    function encodeOnReceivedIntent(
        LimitOrderPublic memory order,
        bytes32 orderId,
        Suave.DataId dataId,
        uint256 random
    ) private pure returns (bytes memory) {
        return
            bytes.concat(
                this.onReceivedIntent.selector,
                abi.encode(order, orderId, dataId, random)
            );
    }

    /// Triggered when an intent is successfully received.
    /// Emits an event on SUAVE chain w/ the tokens traded and the order's expiration timestamp.
    function onReceivedIntent(
        LimitOrderPublic calldata order,
        bytes32 orderId,
        bytes16 dataId,
        uint256 random // TODO: remove or make use of this param
    ) public {
        // check that this order doesn't already exist; check any value in the struct against 0
        if (intentsPending[orderId].amountIn > 0) {
            revert("intent already exists");
        }
        intentsPending[orderId] = order;

        emit LimitOrderReceived(
            orderId,
            dataId,
            order.tokenIn,
            order.tokenOut,
            order.expiryTimestamp,
            random
        );
    }

    /// Broadcast an intent to SUAVE.
    function sendIntent() public view returns (bytes memory suaveCallData) {
        // ensure we're computing in the enclave
        require(Suave.isConfidential(), "not confidential");

        // get the confidential inputs and decode them bytes into a LimitOrder
        bytes memory confidential_inputs = Suave.confidentialInputs();
        LimitOrder memory order = abi.decode(confidential_inputs, (LimitOrder));

        // strip private key from public order
        LimitOrderPublic memory publicOrder = LimitOrderPublic(
            order.tokenIn,
            order.tokenOut,
            order.amountIn,
            order.amountOutMin,
            order.expiryTimestamp
        );
        bytes32 orderId = getOrderId(publicOrder);

        // allowedPeekers: which contracts can read the record (only this contract)
        address[] memory allowedPeekers = new address[](1);
        allowedPeekers[0] = address(this);
        // allowedStores: which kettles can read the record (any kettle)
        address[] memory allowedStores = new address[](1);
        allowedStores[0] = Suave.ANYALLOWED;

        // save private key & recipient addr to confidential storage
        Suave.DataRecord memory record = Suave.newDataRecord(
            0, // decryptionCondition: ignored
            allowedPeekers,
            allowedStores,
            "limit_key" // dataType: namespace
        );
        Suave.confidentialStore(
            record.id,
            HexEncoder.toHexString(orderId),
            abi.encode(order.senderKey, order.to)
        );

        // demo: get price from Uniswap
        uint256 price = UniV2Swop.getAmountOut(1 ether, 100 ether, 42000 ether);

        // returns calldata to trigger `onReceivedIntent()`
        suaveCallData = encodeOnReceivedIntent(
            publicOrder,
            orderId,
            record.id,
            price
            // random
        );
    }

    /// Returns ABI-encoded calldata of `onReceivedIntent(...)`.
    function encodeOnFulfilledIntent(
        bytes32 orderId
    ) private pure returns (bytes memory) {
        return
            bytes.concat(this.onFulfilledIntent.selector, abi.encode(orderId));
    }

    /// Triggered when an intent is fulfilled via `fulfillIntent`.
    function onFulfilledIntent(bytes32 orderId) public {
        delete intentsPending[orderId];
        emit IntentFulfilled(orderId);
    }

    /// Fulfill an intent.
    /// Bundle is expected to be in `confidentialInputs` in the form of:
    ///     [...signedTxs, TX_PLACEHOLDER, ...signedTxs]
    /// e.g. [
    ///     "0x02...1",  // signedTx 1
    ///     "0xf00d",   // TX_PLACEHOLDER
    ///     "0x02...2" // signedTx 2
    /// ]
    function fulfillIntent(
        bytes32 orderId,
        Suave.DataId dataId,
        Transactions.Legacy memory txMeta
    ) public view returns (bytes memory suaveCallData) {
        // ensure we're computing in the enclave (is this required here?)
        require(Suave.isConfidential(), "not confidential");

        LimitOrderPublic memory order = intentsPending[orderId];
        require(order.amountIn > 0, "intent not found");

        (bytes32 privateKey, address to) = abi.decode(
            Suave.confidentialRetrieve(dataId, HexEncoder.toHexString(orderId)),
            (bytes32, address)
        );
        address[] memory path = new address[](2);
        path[0] = order.tokenIn;
        path[1] = order.tokenOut;
        (bytes memory signedTx, bytes memory txData) = UniV2Swop
            .swapExactTokensForTokens(
                SwapExactTokensForTokensRequest(
                    order.amountIn,
                    order.amountOutMin,
                    path,
                    to,
                    order.expiryTimestamp
                ),
                privateKey,
                txMeta
            );

        // verify amountOutMin using eth_call
        uint256 amountOut = abi.decode(
            Suave.ethcall(UniV2Swop.router, txData),
            (uint256)
        );
        require(amountOut >= order.amountOutMin, "insufficient output");
        // Suave.SimulateTransactionResult memory simRes = Suave
        //     .simulateTransaction(
        //         HexEncoder.toHexString(orderId),
        //         signedTx
        //     );
        // require(simRes.success, "tx failed");

        // load bundle from confidentialInputs
        bytes[] memory bundle = abi.decode(
            Suave.confidentialInputs(),
            (bytes[])
        );

        // assemble the full bundle by replacing the bundle entry marked with the placeholder
        for (uint256 i = 0; i < bundle.length; i++) {
            if (bytes2(bundle[i]) == TX_PLACEHOLDER) {
                bundle[i] = signedTx;
                break;
            }
        }

        // encode bundle request
        bytes memory bundleReq = Suave2.encodeBundleRequestJson(
            Suave2.SendBundleRequest({
                txs: bundle,
                blockNumber: 0,
                minTimestamp: 0,
                maxTimestamp: 0,
                revertingTxHashes: new bytes32[](0),
                replacementUuid: ""
            })
        );

        // simulate bundle and revert if it fails
        require(Suave.simulateBundle(bundleReq) > 0, "bundle sim failed");

        // send bundle via flashbots
        bytes memory bundleRes = Suave.submitBundleJsonRPC(
            RPC_URL,
            "eth_sendBundle",
            bundleReq
        );
        // TODO: not sure if this is the right way to check for success
        require(abi.decode(bundleRes, (bool)), "bundle failed");

        // trigger `onFulfilledIntent`
        suaveCallData = encodeOnFulfilledIntent(orderId);
    }
}
