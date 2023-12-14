// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./CasinoLib.sol";

contract SlotMachines {
    mapping(uint256 => CasinoLib.SlotMachine) public slotMachines;
    uint256 numMachines;

    fallback() external payable {}

    receive() external payable {}

    function initSlotMachine(
        uint256 minBet
    ) public payable returns (uint256 slotId, uint8 winChancePercent) {
        require(winChancePercent <= 50, "unreasonable odds");
        CasinoLib.SlotMachine memory machine = CasinoLib.SlotMachine({
            winChancePercent: winChancePercent,
            nonce: 0,
            minBet: minBet,
            // should be economically safe hardcoded values for now
            // but these should be configurable within reasonable params
            jackpotFactor: 10000,
            standardPayoutPercent: 200,
            jackpotPayoutPercent: 9001
        });
        slotMachines[numMachines] = machine;
        slotId = numMachines++;
    }

    function onSlotPulled(
        address gambler,
        uint256 userBet,
        uint256 slotId
    ) public returns (uint256 payout) {
        CasinoLib.SlotMachine memory machine = slotMachines[slotId];
        payout = CasinoLib.calculateSlotPull(userBet, machine);
        if (payout == 0) {
            // return early; gambler lost
            return 0;
        }
        // send winnings
        (bool sent, ) = gambler.call{value: payout}("");
        if (!sent) {
            // may have exceeded the contract's balance
            // refund gambler's bet
            (sent, ) = gambler.call{value: userBet}("");
            require(sent, "critical error; failed to refund user");
        }
    }

    function pullSlot(
        uint256 slotId
    ) public payable returns (bytes memory suave_call_data) {
        CasinoLib.SlotMachine memory machine = slotMachines[slotId];
        require(msg.value >= machine.minBet, "must place at least minimum bet");
        // TODO: encode calldata to onSlotPulled
    }
}
