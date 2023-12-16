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
    if (!slotsClient.slotMachinesAddress) throw new Error('slot machine must be deployed first')
    const initMachineResult = await slotsClient.initSlotMachine(
        parseEther(startingPot),
        parseEther(minBet),
        winChangePercent
    )
    console.log('init machine result', initMachineResult)
    const filedata = JSON.parse(fs.readFileSync(args.deploymentFile, 'utf8'))
    const data = {
        ...filedata,
        initializedSlots: [
            ...(filedata.initializedSlots || []),
            initMachineResult.slotId
        ]
    }
    fs.writeFileSync(args.deploymentFile, JSON.stringify(data, (_, v) => {
        if (typeof v === 'bigint') {return v.toString()} else {return v}
    }, 2))
}

export default function initMachineCli() {
    let command = new Command()
        .name('init')
        .description('Initialize a new slot machine.')
        .argument('[startingPot]', 'Starting pot for the slot machine. (human format)', '1')
        .argument('[minBet]', 'Minimum bet for the slot machine. (human format)', '0.001')
        .argument('[winChancePercent]', 'Win chance percent for the slot machine. (%)', '49')
    command = withCommonArgs(command, ['--kettle-address'])
    return command
        .action(initMachine)
}
