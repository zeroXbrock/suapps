
import { http, Address, Hex, HttpTransport, decodeEventLog } from 'viem'
import { SuaveProvider, getSuaveProvider, getSuaveWallet } from 'viem/chains/utils'
// import { testIntents } from './examples/limitOrder'
import { SlotsClient } from './lib/slots'
import { ETH, roundEth } from './lib/utils'
import SlotsContract from './contracts/out/Slots.sol/SlotMachines.json';
import { testSlotMachine } from './examples/slotMachine';


const adminKey = '0x91ab9a7e53c220e6210460b65a7a3bb2ca181412a8a7b43ff336b3df1737ce12'
const userKey: Hex = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const KETTLE_ADDRESS: Address = "0xb5feafbdd752ad52afb7e1bd2e40432a485bbb7f"
const suaveProvider: SuaveProvider<HttpTransport> = getSuaveProvider(http("http://localhost:8545"))
const adminWallet = getSuaveWallet({
  transport: http("http://localhost:8545"),
  privateKey: adminKey,
})

const deployNew = false

/** // TODO:
 * add a CLI to interact with contracts:
 * - deploy, show deployed addresses
 * - init slot machines, show available machines & stats
 * - buy chips
 * - play slots
 * - show balance
 * - cash out
 */
async function main() {
  // await testIntents(adminWallet, suaveProvider, userKey, KETTLE_ADDRESS)
  await testSlotMachine({
    suaveProvider,
    adminWallet,
    deployNew,
  })
}

main().then(() => {
  console.log('done')
})
