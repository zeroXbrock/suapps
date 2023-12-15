import { Command } from 'commander'
import { isHex } from 'viem'
import fs from 'fs'
import { getHookedUp, type CommonArgs, withCommonArgs } from './commonArgs'

async function deploy(args: CommonArgs & {
    libAddress?: string,
    force: boolean,
}) {
    if (!isHex(args.privateKey) || args.privateKey.length !== 66) throw new Error(`invalid private key.`)
    if (!isHex(args.kettleAddress) || args.kettleAddress.length !== 42) throw new Error(`invalid kettle address.`)
    if (args.libAddress && (!isHex(args.libAddress) || args.libAddress.length !== 42)) throw new Error(`invalid lib address.`)
    if (fs.existsSync(args.deploymentFile) && !args.force) {
        console.log(`save file found at '${args.deploymentFile}', use --force to overwrite`)
        console.log(JSON.parse(fs.readFileSync(args.deploymentFile, 'utf8')))
        return
    }
    const {slotsClient} = getHookedUp(args)
    const deployedClient = await slotsClient.deploy()
    const {slotMachinesAddress, slotLibAddress} = deployedClient
    console.log('deployed', {slotMachinesAddress, slotLibAddress})

    const data = JSON.stringify({slotMachinesAddress, slotLibAddress}, null, 2)
    fs.writeFileSync(args.deploymentFile, data)
}

export default function deployCli() { 
    let command = new Command()
        .name('deploy')
        .description('Deploy the slot machine contracts.')
        .option('--lib', 'Pre-deployed CasinoLib address (Default: New instance is deployed)')
        .option('-f, --force', 'Deploy new contracts & overwrite save file if it exists.', false)
    command = withCommonArgs(command)
    return command
        .action(deploy)
}
