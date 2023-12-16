import { Command, Option } from 'commander'
import { SlotsClient } from '../../lib/slots'
import { SuaveProvider, SuaveWallet, getSuaveProvider, getSuaveWallet } from 'viem/chains/utils'
import { Address, Hex, HttpTransport, http, isHex } from 'viem'
import fs from 'fs'

export const DEFAULT_ADMIN_KEY: Hex = '0x91ab9a7e53c220e6210460b65a7a3bb2ca181412a8a7b43ff336b3df1737ce12'
export const DEFAULT_KETTLE_ADDRESS: Address = '0xb5feafbdd752ad52afb7e1bd2e40432a485bbb7f'

/** CLI args shared by most commands. */
export type CommonArgs = {
    privateKey: string,
    rpcUrl: string,
    kettleAddress: string,
    deploymentFile: string,
}

/** Options to be added to a command. */
export const commonArgs: Option[] = [
    new Option('-p, --private-key <privateKey>', `Private key of wallet used to deploy contracts.`).default(DEFAULT_ADMIN_KEY),
    new Option('-r, --rpc-url <rpcUrl>', 'URL of suave-geth RPC node. (only supports http for now)').default('http://localhost:8545'),
    new Option('-k, --kettle-address  <kettleAddress>', 'Address of SUAVE Kettle that will process your confidential requests.').default(DEFAULT_KETTLE_ADDRESS),
    new Option('-d, --deployment-file  <deploymentFile>', 'Path to file where deployment information is saved.').default('./deployments/slots.json'),
]

/** Attach common args to the provided command in the returned value.
 * 
 * Optionally allow excluding certain args by their long name.
*/
export function withCommonArgs (command: Command, exclude?: string[]) {
    for (const option of commonArgs) {
        if (option.long && exclude && exclude.includes(option.long)) continue
        command = command.addOption(option)
    }
    return command
}

/** Parses args to return a fresh SlotsClient along with the wallet and provider used to create it.  */
export function getHookedUp(args: CommonArgs & any): {
    wallet: SuaveWallet<HttpTransport>,
    provider: SuaveProvider<HttpTransport>,
    slotsClient: SlotsClient<HttpTransport>,
} {
    console.log('args.privatekey', args.privateKey)
    if (
        !args.privateKey || !isHex(args.privateKey) || args.privateKey.length !== 66
        || !args.rpcUrl
    ) {
        throw new Error('Invalid arguments. Please provide privateKey, rpcUrl, kettleAddress, and deploymentFile.')
    }

    const fileConfig = args.deploymentFile && fs.existsSync(args.deploymentFile) ?
        JSON.parse(fs.readFileSync(args.deploymentFile, 'utf8')) :
        undefined
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
        slotMachinesAddress: fileConfig?.slotMachinesAddress as Hex | undefined,
        slotIds: fileConfig?.initializedSlots as bigint[] | undefined,
    })
    return {
        wallet,
        provider,
        slotsClient,
    }
}
