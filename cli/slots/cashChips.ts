import { Transport, parseEther } from 'viem'
import { CommonArgs, getHookedUp, withCommonArgs } from './commonArgs'
import { Command } from 'commander'
import { SuaveProvider } from 'viem/chains/utils'

async function cashChips<T extends Transport>(args: CommonArgs, provider: SuaveProvider<T>, amount?: string) {
    const {slotsClient} = getHookedUp(args)
    const realAmount = amount ? parseEther(amount) : await slotsClient.chipsBalance()
    if (!amount) {
        console.log(`cashing out full balance: ${realAmount} chips`)
    } else {
        console.log(`cashing out ${amount} chips`)
    }
    const txHash = await slotsClient.cashChips(realAmount)
    console.log("cashed out chips", txHash)
}

export default function cashChipsCli() {
    let command = new Command()
        .name('cash-chips')
        .alias('quit')
        .description('Cash out your chips for SUAVE-ETH.')
        .argument('[amount]', 'Amount of SUAVE-ETH to cash out (human format).')
    command = withCommonArgs(command, ['--kettle-address'])
    return command
        .action((amount, args) => cashChips(args, amount))
}
