import { SuaveProvider, SuaveTxTypes, SuaveWallet, TransactionReceiptSuave, getSuaveProvider, getSuaveWallet } from 'viem/chains/utils'
import IntentsContract from '../contracts/out/Intents.sol/Intents.json'
import { LimitOrder } from '../lib/limitOrder'
import { SuaveRevert } from '../lib/suave'
import { Hex, Transport, concatHex, encodeFunctionData, http, padHex, toHex } from 'viem'
import { DEFAULT_ADMIN_KEY, DEFAULT_KETTLE_ADDRESS } from '../cli/slots/commonArgs'

async function testIntents<T extends Transport>(
    adminWallet: SuaveWallet<T>
    , suaveProvider: SuaveProvider<T>
    , userKey: Hex
    , KETTLE_ADDRESS: Hex) {
    const deployContractTxHash = await adminWallet.deployContract({
        abi: IntentsContract.abi,
        bytecode: IntentsContract.bytecode.object as Hex
    })
    const receipt: TransactionReceiptSuave = await suaveProvider.waitForTransactionReceipt({hash: deployContractTxHash})
    console.log(`contract deployed at tx ${deployContractTxHash}\ncontract_address: ${receipt.contractAddress}`)
    if (!receipt.contractAddress) {
      throw new Error('no contract address')
    }
  
    const limitOrder = new LimitOrder({
      amountInMax: 13n,
      amountOutMin: 14n,
      expiryTimestamp: 0x65665489n,
      senderKey: userKey as Hex,
      tokenIn: '0xea7ea7ea7ea7ea7ea7ea7ea7ea7ea7ea7ea7eea7' as Hex,
      tokenOut: '0xf00d0f00d0f00d0f00d0f00d0f00d0f00d0f000d' as Hex,
    }, suaveProvider, receipt.contractAddress, KETTLE_ADDRESS)
  
    const tx = await limitOrder.toTransactionRequest()
    let limitOrderTxHash: Hex = '0x'
    try {
      limitOrderTxHash = await adminWallet.sendTransaction(tx)
    } catch (e) {
      // TODO: would be nice to have this as the default response in the client
      throw new SuaveRevert(e as Error)
    }
  
    const ccrReceipt = await suaveProvider.waitForTransactionReceipt({hash: limitOrderTxHash})
    console.log("ccrReceipt", ccrReceipt)
    // TODO: fix this error: `txRes: TransactionSuave` => "Types of property 'chainId' are incompatible."
    const txRes = await suaveProvider.getTransaction({hash: limitOrderTxHash})
    console.log("txRes", txRes)
  
    if (txRes.type !== SuaveTxTypes.Suave) {
      throw new Error('expected SuaveTransaction type (0x50)')
    }
  
    // check `confidentialComputeResult`; should be calldata for `onReceivedIntent`
    const fnSelector: Hex = `0x${IntentsContract.methodIdentifiers['onReceivedIntent((address,address,uint256,uint256,uint256),bytes32,uint256)']}`
    const expectedData = [
      limitOrder.tokenIn,
      limitOrder.tokenOut,
      toHex(limitOrder.amountInMax),
      toHex(limitOrder.amountOutMin),
      toHex(limitOrder.expiryTimestamp),
      limitOrder.orderId(),
    ].map(
      param => padHex(param, {size: 32})
    ).reduce(
      (acc, cur) => concatHex([acc, cur])
    )
    const expectedRawResult = concatHex([fnSelector, expectedData])
    if (!txRes.confidentialComputeResult.startsWith(expectedRawResult)) {
      throw new Error('expected confidential compute result to be calldata for `onReceivedIntent`')
    }
  
    // TODO: check onchain for intent
    const intentResult = await suaveProvider.call({
      account: adminWallet.account.address,
      to: receipt.contractAddress,
      data: encodeFunctionData({
        abi: IntentsContract.abi,
        args: [limitOrder.orderId()],
        functionName: 'intents_pending'
      }),
      gasPrice: 10000000000n,
      gas: 42000n,
      type: '0x0'
    })
    console.log('intentResult', intentResult)
}

async function main() {
  const adminWallet = getSuaveWallet({
    privateKey: DEFAULT_ADMIN_KEY,
    transport: http('http://localhost:8545'),
  })
  const suaveProvider = getSuaveProvider(http('http://localhost:8545'))
  const USERKEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  await testIntents(adminWallet, suaveProvider, USERKEY, DEFAULT_KETTLE_ADDRESS)
}

main()
