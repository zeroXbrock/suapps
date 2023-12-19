import { Command } from 'commander'
import { CommonArgs, getHookedUp, withCommonArgs } from './commonArgs'
import { Hex, formatEther } from 'viem'

async function getBalances(
    args: CommonArgs, account?: string,
) {
    const { slotsClient, provider, wallet } = getHookedUp(args);
    const addr = account ? account : wallet.account.address
    if (!slotsClient.slotMachinesAddress) throw new Error('slot machine must be deployed first');
    const balance = await slotsClient.chipsBalance(account as Hex | undefined)
    console.log(`Address:\t${addr}\nChips:\t\t${formatEther(balance)}`)
}

export default function balanceCli() {
    let command = new Command()
        .name('balance')
        .description('Get chips balance of an account.')
        .argument('[account]', 'Address of the account.', '0xBE69d72ca5f88aCba033a063dF5DBe43a4148De0')
    command = withCommonArgs(command, ['--kettle-address'])
    return command
        .action((account, args) => getBalances(args, account))
}