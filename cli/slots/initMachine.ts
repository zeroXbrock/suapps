import { Command } from 'commander'
import { CommonArgs, getHookedUp, withCommonArgs } from './commonArgs'
import fs from 'fs'
import { parseEther } from 'viem'

async function initMachine(
    startingPot: string,
    minBet: string,
    winChangePercent: number,
    args: CommonArgs
) {
    console.log({
        startingPot,
        minBet,
        winChangePercent,
        args
    })

    const {slotsClient} = getHookedUp(args)
    const initMachineResult = await slotsClient.initSlotMachine(
        parseEther(startingPot),
        parseEther(minBet),
        winChangePercent
    )
    console.log('init machine result', initMachineResult)

    // const data = JSON.stringify({slotMachinesAddress, slotLibAddress}, null, 2)
    // fs.writeFileSync(args.deploymentFile, data)
}

export default function initMachineCli() {
    let command = new Command()
        .name('init')
        .description('Initialize a new slot machine.')
        .argument('[startingPot]', 'Starting pot for the slot machine. (human format)', '1')
        .argument('[minBet]', 'Minimum bet for the slot machine. (human format)', '0.001')
        .argument('[winChancePercent]', 'Win chance percent for the slot machine. (%)', '49')
        // .option('--starting-pot <startingPot>', 'Starting pot for the slot machine.', '1000000000000000000')
        // .option('--min-bet <minBet>', 'Minimum bet for the slot machine.', '100000000000000000')
        // .option('--win-chance-percent <winChancePercent>', 'Win chance percent for the slot machine.', '50')
    command = withCommonArgs(command, ['--kettle-address'])
    return command
        .action(initMachine)
}