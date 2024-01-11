// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {HexEncoder} from "./HexEncoder.sol";
import {Suave} from "suavestd/suavelib/Suave.sol";
import {console2} from "forge/console2.sol";

library Suave2 {
    struct SendBundleRequest {
        bytes[] txs;
        uint256 blockNumber;
        uint256 minTimestamp; // optional
        uint256 maxTimestamp; // optional
        bytes32[] revertingTxHashes; // optional
        string replacementUuid; // optional
    }

    /** 
    would be nice to have a generalized JSON encoder, which
    can encode JSON from any struct.
    */

    function jsonPropParam(
        string memory _json,
        uint256 value
    ) internal pure returns (string memory json) {
        json = string.concat(_json, '"0x');
        json = string.concat(json, HexEncoder.toHexString(value));
        json = string.concat(json, '"');
    }

    function jsonArrayParam(
        string memory _json,
        bytes[] memory values
    ) internal pure returns (string memory json) {
        json = string.concat(_json, "[");
        for (uint256 i = 0; i < values.length; i++) {
            if (i > 0) {
                json = string.concat(json, ",");
            }
            json = string.concat(json, '"0x');
            json = string.concat(json, HexEncoder.toHexString(values[i]));
            json = string.concat(json, '"');
        }
        json = string.concat(json, "]");
    }

    function jsonArrayParam(
        string memory _json,
        bytes32[] memory values
    ) internal pure returns (string memory json) {
        json = string.concat(_json, "[");
        for (uint256 i = 0; i < values.length; i++) {
            if (i > 0) {
                json = string.concat(json, ",");
            }
            json = string.concat(json, '"0x');
            json = string.concat(json, HexEncoder.toHexString(values[i]));
            json = string.concat(json, '"');
        }
        json = string.concat(json, "]");
    }

    /// Returns bundle request in JSON format, which can be used in suave-std `simulateBundle` or `submitBundleJsonRPC`.
    /// Note: the request must be a full bundle, not a placeholder bundle.
    function encodeBundleRequestJson(
        SendBundleRequest memory request
    ) public pure returns (bytes memory) {
        string memory json = "{";
        json = string.concat(json, '"txs":');
        json = jsonArrayParam(json, request.txs);
        json = string.concat(json, ',"blockNumber":');
        json = jsonPropParam(json, request.blockNumber);
        // json = string.concat(json, HexEncoder.toHexString(request.blockNumber));
        if (request.minTimestamp > 0) {
            json = string.concat(json, ',"minTimestamp":');
            json = jsonPropParam(json, request.minTimestamp);
        }
        if (request.maxTimestamp > 0) {
            json = string.concat(json, ',"maxTimestamp":');
            json = jsonPropParam(json, request.maxTimestamp);
        }
        if (request.revertingTxHashes.length > 0) {
            json = string.concat(json, ',"revertingTxHashes":');
            json = jsonArrayParam(json, request.revertingTxHashes);
        }
        if (bytes(request.replacementUuid).length > 0) {
            json = string.concat(json, ',"replacementUuid":"');
            json = string.concat(json, request.replacementUuid);
            json = string.concat(json, '"');
        }
        json = string.concat(json, "}");
        return bytes(json);
    }

    // possibly the most breakable solidity function ever to exist.
    function eth_getBlockNumber(
        string memory rpcUrl
    ) public view returns (uint256 blockNumber) {
        string[] memory headers = new string[](1);
        headers[0] = "Content-Type: application/json";
        Suave.HttpRequest memory request = Suave.HttpRequest({
            /** 
                string url;
                string method;
                string[] headers;
                bytes body;
                bool withFlashbotsSignature;
            */
            url: rpcUrl,
            method: "POST",
            headers: headers,
            body: bytes(
                '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}'
            ),
            withFlashbotsSignature: false
        });
        bytes memory jsonResult = Suave.doHTTPRequest(request);
        console2.logBytes(jsonResult);
        blockNumber = abi.decode(jsonResult, (uint256));
    }
}
