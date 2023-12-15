import { formatEther, parseEther } from 'viem'
import { CommonArgs, getHookedUp, withCommonArgs } from './commonArgs'
import { Command } from 'commander'

async function buyChips(amount: string, args: CommonArgs) {
    const {slotsClient} = getHookedUp(args)
    const amountRaw = parseEther(amount)
    const txHash = await slotsClient.buyChips(amountRaw)
    console.log("bought chips", txHash)
    const balance = await slotsClient.chipsBalance()
    console.log(`new balance: ${formatEther(balance)} chips`)
}

export default function buyChipsCli() {
    let command = new Command()
        .name('buy-chips')
        .alias('buy')
        .alias('bc')
        .description('Buy chips to play slots with.')
        .argument('[amount]', 'Amount of SUAVE-ETH to buy chips with (human format).', '0.5')
    command = withCommonArgs(command, ['--kettle-address'])
    return command
        .action(buyChips)
}
