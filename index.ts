
import { http, Address, Hex, HttpTransport } from 'viem'
import { SuaveProvider, getSuaveProvider, getSuaveWallet } from 'viem/chains/utils'
import { testIntents } from './examples/limitOrder'
import { SlotsClient } from './lib/slots'

const adminKey = '0x91ab9a7e53c220e6210460b65a7a3bb2ca181412a8a7b43ff336b3df1737ce12' // adminWallet
const userKey: Hex = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const KETTLE_ADDRESS: Address = "0xb5feafbdd752ad52afb7e1bd2e40432a485bbb7f"
const suaveProvider: SuaveProvider<HttpTransport> = getSuaveProvider(http("http://localhost:8545"))
const adminWallet = getSuaveWallet({
  transport: http("http://localhost:8545"),
  privateKey: adminKey,
})

async function main() {
  // await testIntents(adminWallet, suaveProvider, userKey, KETTLE_ADDRESS)
  // so silly that this is "const" but it's internally mutable
  // TODO: use Rust
  const slotsClient = new SlotsClient({
    wallet: adminWallet,
    provider: suaveProvider,
    kettleAddress: KETTLE_ADDRESS,
  })
  await slotsClient.deploy()
  
  const res = await slotsClient.initSlotMachine(1000000000000000n)
  console.log("initialized slot machine", res)
}

main().then(() => {
  console.log('done')
})
