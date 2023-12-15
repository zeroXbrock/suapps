import { formatEther, parseEther } from 'viem'
import { CommonArgs, getHookedUp, withCommonArgs } from './commonArgs'
import { Command } from 'commander'

async function cashChips(args: CommonArgs, amount?: string) {
    const {slotsClient, provider, wallet} = getHookedUp(args)
    const chipsBalance = await slotsClient.chipsBalance()
    if (chipsBalance === 0n) {
        console.error('no chips to cash out')
        return
    }
    const realAmount = amount ? parseEther(amount) : chipsBalance
    if (!amount) {
        console.log(`cashing out full balance: ${formatEther(realAmount)} chips`)
    } else {
        console.log(`cashing out ${amount} chips`)
    }
    const txHash = await slotsClient.cashChips(realAmount)
    console.log("cashed out chips", txHash)
    const balance = await provider.getBalance({address: wallet.account.address})
    console.log(`new SUAVE-ETH balance: ${formatEther(balance)}`)
    const newChipsBalance = await slotsClient.chipsBalance()
    console.log(`new chips balance: ${formatEther(newChipsBalance)} chips`)
}

export default function cashChipsCli() {
    let command = new Command()
        .name('cash-chips')
        .alias('cashout')
        .alias('quit')
        .description('Cash out your chips for SUAVE-ETH.')
        .argument('[amount]', 'Amount of SUAVE-ETH to cash out (human format).')
    command = withCommonArgs(command, ['--kettle-address'])
    return command
        .action((amount, args) => cashChips(args, amount))
}
