import { http, Address, Transport } from 'viem'
import { SuaveProvider, SuaveWallet, getSuaveProvider, getSuaveWallet } from 'viem/chains/utils'
import { SlotsClient, checkSlotPullReceipt } from '../lib/slots'
import { ETH, roundEth } from '../lib/utils'
import { DEFAULT_ADMIN_KEY, DEFAULT_KETTLE_ADDRESS } from '../cli/slots/commonArgs';

export async function testSlotMachine<T extends Transport>(params: {
    suaveProvider: SuaveProvider<T>,
    adminWallet: SuaveWallet<T>,
    kettleAddress?: Address,
}) {
    const {
        suaveProvider,
        adminWallet,
        kettleAddress = "0xb5feafbdd752ad52afb7e1bd2e40432a485bbb7f"
    } = params
    const startBalance = await suaveProvider.getBalance({address: adminWallet.account.address})
    console.log("admin balance", roundEth(startBalance))

    const slotId = 0n // each should be initiated with 1 ETH
    const slotsClient = new SlotsClient({
        wallet: adminWallet,
        provider: suaveProvider,
        kettleAddress,
    })

    // deploy contracts
    await slotsClient.deploy()
    // buy chips to play
    const buyChipsRes = await slotsClient.buyChips(1n * ETH)
    await suaveProvider.waitForTransactionReceipt({hash: buyChipsRes})

    // init slot machine w/ 1 ETH and 25% chance of winning
    const initSlotsRes = await slotsClient.initSlotMachine(1n * ETH, 1000000000000000n, 25)
    console.log("initialized slot machine", initSlotsRes)
    console.log("chips balance", roundEth(await slotsClient.chipsBalance()))

    // play slot machine
    const numTries = 100
    for (let i = 0; i < numTries; i++) {
        try {
        const txHash = await slotsClient.pullSlot(slotId, 10000000000000000n)
        const txReceipt = await suaveProvider.waitForTransactionReceipt({hash: txHash})
        console.log("played slot machine", txReceipt.status)
        for (const res of checkSlotPullReceipt(txReceipt)) {
            console.log(res)
        }
        } catch (e) {
            const err = (e as Error).message;
            const hexString = err.match(/execution reverted: (0x[0-9a-fA-F]+)/)?.[1];
            const errMsg = Buffer.from(hexString!.slice(2), 'hex').toString('utf8')
            console.error(errMsg);
        }

        console.log("chips balance", roundEth(await slotsClient.chipsBalance()))
    }

    const endBalance = await suaveProvider.getBalance({address: adminWallet.account.address})
    console.log("admin balance", roundEth(endBalance))
    const spent = startBalance - endBalance
    console.log("spent", roundEth(spent))
}

async function main() {
    const adminWallet = getSuaveWallet({
        privateKey: DEFAULT_ADMIN_KEY,
        transport: http('http://localhost:8545'),
    })
    const suaveProvider = getSuaveProvider(http('http://localhost:8545'))
    await testSlotMachine({
        suaveProvider,
        adminWallet,
        kettleAddress: DEFAULT_KETTLE_ADDRESS,
    })
}
  
main()
