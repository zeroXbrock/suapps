import { Command } from 'commander'
import { SlotsClient } from '../lib/slots'
import { getSuaveProvider, getSuaveWallet } from 'viem/chains/utils'
import { Address, Hex, http } from 'viem'
import fs from 'fs'

// TODO: these will probably need to be shared a lot; move them to a common area
const DEFAULT_ADMIN_KEY: Hex = '0x91ab9a7e53c220e6210460b65a7a3bb2ca181412a8a7b43ff336b3df1737ce12'
const DEFAULT_KETTLE_ADDRESS: Address = '0xb5feafbdd752ad52afb7e1bd2e40432a485bbb7f'

const withDeployCommand = (command: Command) => command
    .name('deploy')
    .description('Deploy the slot machine contracts.')
    .option('-p, --private-key', `Private key of wallet used to deploy contracts.`, DEFAULT_ADMIN_KEY)
    .option('-l, --lib-address', 'Pre-deployed CasinoLib address (Default: New instance is deployed)')
    .option('-r, --rpc-url', 'URL of suave-geth RPC node. (only supports http for now)', 'http://localhost:8545')
    .option('-k, --kettle-address', 'Address of SUAVE Kettle that will process your confidential requests.', DEFAULT_KETTLE_ADDRESS)
    .option('-s, --save-file', 'File path to save deployed contract addresses to.', './deployments/slots.json')
    .option('-f, --force', 'Deploy new contracts & overwrite save file if it exists.', false)
    .action(async (args: {
        privateKey: Hex,
        rpcUrl: string,
        kettleAddress: Address,
        libAddress?: Address,
        saveFile: string,
        force: boolean,
    }) => {
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
            slotLibAddress: args.libAddress,
        })
        const deployedClient = await slotsClient.deploy()
        const {slotMachinesAddress, slotLibAddress} = deployedClient
        console.log('deployed', {slotMachinesAddress, slotLibAddress})

        const data = JSON.stringify({slotMachinesAddress, slotLibAddress}, null, 2)
        fs.writeFileSync(args.saveFile, data)
    })

let slotsCli = new Command()
    .name('slots')
    .description('Slot machine that uses credibly generated entropy from SUAVE.')

slotsCli = withDeployCommand(slotsCli)

export { slotsCli }
