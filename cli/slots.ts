import { Command, Option } from 'commander'
import { SlotsClient } from '../lib/slots'
import { getSuaveProvider, getSuaveWallet } from 'viem/chains/utils'
import { Address, Hex, http, isHex } from 'viem'
import fs from 'fs'

// TODO: these will probably need to be shared a lot; move them to a common area
const DEFAULT_ADMIN_KEY: Hex = '0x91ab9a7e53c220e6210460b65a7a3bb2ca181412a8a7b43ff336b3df1737ce12'
const DEFAULT_KETTLE_ADDRESS: Address = '0xb5feafbdd752ad52afb7e1bd2e40432a485bbb7f'

type CommonArgs = {
    privateKey: string,
    rpcUrl: string,
    kettleAddress: string,
}

const withCommonArgs = (command: Command, exclude?: string[]) => {
    for (const option of commonArgs) {
        if (option.long && exclude && exclude.includes(option.long)) continue
        command = command.addOption(option)
    }
    return command
}

const commonArgs: Option[] = [
    new Option('-p, --private-key', `Private key of wallet used to deploy contracts.`).default(DEFAULT_ADMIN_KEY),
    new Option('-r, --rpc-url', 'URL of suave-geth RPC node. (only supports http for now)').default('http://localhost:8545'),
    new Option('-k, --kettle-address', 'Address of SUAVE Kettle that will process your confidential requests.').default(DEFAULT_KETTLE_ADDRESS),
]

const deploy = async (args: CommonArgs & {
    libAddress?: string,
    saveFile: string,
    force: boolean,
}) => {
    if (!isHex(args.privateKey) || args.privateKey.length !== 66) throw new Error(`invalid private key.`)
    if (!isHex(args.kettleAddress) || args.kettleAddress.length !== 42) throw new Error(`invalid kettle address.`)
    if (args.libAddress && (!isHex(args.libAddress) || args.libAddress.length !== 42)) throw new Error(`invalid lib address.`)
    if (fs.existsSync(args.saveFile) && !args.force) {
        console.log(`save file found at '${args.saveFile}', use --force to overwrite`)
        console.log(JSON.parse(fs.readFileSync(args.saveFile, 'utf8')))
        return
    }
    const wallet = getSuaveWallet({
        privateKey: args.privateKey,
        transport: http(args.rpcUrl),
    })
    const provider = getSuaveProvider(http(args.rpcUrl))
    const slotsClient = new SlotsClient({
        wallet,
        provider,
        kettleAddress: args.kettleAddress,
        slotLibAddress: args.libAddress as Hex | undefined,
    })
    const deployedClient = await slotsClient.deploy()
    const {slotMachinesAddress, slotLibAddress} = deployedClient
    console.log('deployed', {slotMachinesAddress, slotLibAddress})

    const data = JSON.stringify({slotMachinesAddress, slotLibAddress}, null, 2)
    fs.writeFileSync(args.saveFile, data)
}

const deployCli = () => { 
    let command = new Command()
        .name('deploy')
        .description('Deploy the slot machine contracts.')
        .option('-s, --save-file', 'File path to save deployed contract addresses to.', './deployments/slots.json')
        .option('--lib', 'Pre-deployed CasinoLib address (Default: New instance is deployed)')
        .option('-f, --force', 'Deploy new contracts & overwrite save file if it exists.', false)
    command = withCommonArgs(command)
    return command
        .action(deploy)
}

const buyChipsCli = () => {
    let command = new Command()
        .name('buy-chips')
        .alias('buy')
        .alias('bc')
        .description('Buy chips to play slots with.')
        .option('-a, --amount', 'Amount of SUAVE-ETH to buy chips with (human format).', '0.5')
    command = withCommonArgs(command, ['--kettle-address'])
    return command.action(async (args: CommonArgs & {amount: string}) => {
        console.log(args.amount)
    })
}

export { deployCli, buyChipsCli }
