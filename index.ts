import { http, Hex } from "viem"
import { suaveRigil } from "viem/chains"
import { TransactionRequestSuave, getSuaveProvider, getSuaveWallet } from 'viem/chains/utils'

console.log("Hello", suaveRigil.name, suaveRigil.id)

const provider = getSuaveProvider(http("http://localhost:8545"))

const privateKey: Hex = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

async function main() {
    const block = await provider.getBlockNumber()
    
    const wallet = getSuaveWallet({
        transport: http("http://localhost:8545"),
        privateKey,
    })
    
    
    console.log("Current block:", block)
    
}

main()
