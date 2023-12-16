import { Command } from 'commander'
import { CommonArgs, getHookedUp, withCommonArgs } from './commonArgs'
import { parseEther } from 'viem'
import { checkSlotPullReceipt } from '../../lib/slots';

async function playSlot(
    slotId: string, bet: string, args: CommonArgs
) {
    const { slotsClient, provider } = getHookedUp(args);
    if (!slotsClient.slotMachinesAddress) throw new Error('slot machine must be deployed first');
    const hash = await slotsClient.pullSlot(BigInt(slotId), parseEther(bet));
    const txReceipt = await provider.waitForTransactionReceipt({hash});
    for (const res of checkSlotPullReceipt(txReceipt)) {
        console.log(res);
    }
}

export default function playCli() {
    let command = new Command()
        .name('play')
        .description('Play a slot machine.')
        .argument('<slotId>', 'Slot machine to play. (example: 0')
        .argument('<bet>', 'Amount of chips to bet. (human format; example: 0.01)')
    command = withCommonArgs(command)
    return command
        .action(playSlot)
}