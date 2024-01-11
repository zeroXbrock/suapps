// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge/StdAssertions.sol";
import "forge/Test.sol";
import "forge/console2.sol";

import "./Suave2.sol";

contract Suave2Test is Test {
    function testJsonBundle() public {
        bytes[] memory txs = new bytes[](2);
        txs[0] = hex"1234000000001234";
        txs[1] = hex"5678000000005678";
        Suave2.SendBundleRequest memory request = Suave2.SendBundleRequest({
            txs: txs,
            blockNumber: 123,
            minTimestamp: 0,
            maxTimestamp: 0,
            revertingTxHashes: new bytes32[](0),
            replacementUuid: ""
        });
        bytes memory json = Suave2.encodeBundleRequestJson(request);
        assertEq(
            string(json),
            '{"txs":["0x1234000000001234","0x5678000000005678"],"blockNumber":"0x000000000000000000000000000000000000000000000000000000000000007b"}'
        );

        request = Suave2.SendBundleRequest({
            txs: txs,
            blockNumber: 123,
            minTimestamp: 1,
            maxTimestamp: 0,
            revertingTxHashes: new bytes32[](0),
            replacementUuid: ""
        });
        json = Suave2.encodeBundleRequestJson(request);
        assertEq(
            string(json),
            '{"txs":["0x1234000000001234","0x5678000000005678"],"blockNumber":"0x000000000000000000000000000000000000000000000000000000000000007b","minTimestamp":"0x0000000000000000000000000000000000000000000000000000000000000001"}'
        );

        bytes32[] memory revertingTxHashes = new bytes32[](2);
        revertingTxHashes[0] = keccak256("hello");
        revertingTxHashes[1] = keccak256("suave");
        request = Suave2.SendBundleRequest({
            txs: txs,
            blockNumber: 123,
            minTimestamp: 1,
            maxTimestamp: 1,
            revertingTxHashes: revertingTxHashes,
            replacementUuid: "1111-1111-1111-1111-1111"
        });
        json = Suave2.encodeBundleRequestJson(request);
        assertEq(
            string(json),
            '{"txs":["0x1234000000001234","0x5678000000005678"],"blockNumber":"0x000000000000000000000000000000000000000000000000000000000000007b","minTimestamp":"0x0000000000000000000000000000000000000000000000000000000000000001","maxTimestamp":"0x0000000000000000000000000000000000000000000000000000000000000001","revertingTxHashes":["0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8","0x8cc2c47756da6e47fbb3800d856641b3cb86e24947499e9370d70c85135df19a"],"replacementUuid":"1111-1111-1111-1111-1111"}'
        );
    }
}
