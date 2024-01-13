import { SuaveProvider, SuaveTxTypes, SuaveWallet, TransactionReceiptSuave, TransactionRequestSuave, getSuaveProvider, getSuaveWallet } from 'viem/chains/utils'
import IntentsContract from '../contracts/out/Intents.sol/Intents.json'
import { 
  LimitOrder, deployLimitOrderManager,
  // deployLimitOrderManager
} from '../lib/limitOrder'
import { SuaveRevert } from '../lib/suave'
import { 
  Hex,
  PublicClient,
  Transport,
  concatHex,
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodeFunctionData,
  getEventSelector,
  http,
  keccak256,
  padHex,
  parseEther,
  toHex
} from 'viem'
import { DEFAULT_ADMIN_KEY, TESTNET_KETTLE_ADDRESS } from '../cli/helpers'
import { goerli, suaveRigil } from 'viem/chains'
import config from "./env"
import { privateKeyToAccount, sign, signTransaction } from 'viem/accounts'
import { ETH } from '../lib/utils'
import { Bundle, FulfillIntentRequest, TxMeta } from '../lib/intentBundle'

async function testIntents<T extends Transport>(
    adminWallet: SuaveWallet<T>
    , suaveProvider: SuaveProvider<T>
    , userKey: Hex
    , kettleAddress: Hex) {
    const intentRouterAddress = await deployLimitOrderManager(adminWallet, suaveProvider)
    // const intentRouterAddress = '0x8a0668a89f69fba939745eebfa7bd7fca433a0b3' as Hex
    console.log("intentRouterAddress", intentRouterAddress)

    // automagically decode revert messages before throwing them
    // TODO: build this natively into the wallet client
    adminWallet = adminWallet.extend((client) => ({
      async sendTransaction(tx: TransactionRequestSuave): Promise<Hex> {
        try {
          return await client.sendTransaction(tx)
        } catch (e) {
          throw new SuaveRevert(e as Error)
        }
      }
    }))

    console.log("buying FROGE with WETH", parseEther('1'))
    const limitOrder = new LimitOrder({
      amountInMax: parseEther('1'),
      amountOutMin: 13n,
      expiryTimestamp: BigInt(Math.round(new Date().getTime() / 1000) + 3600),
      senderKey: userKey,
      tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Hex, // WETH
      tokenOut: '0xe9a97B0798b1649045c1D7114F8C432846828404' as Hex, // FROGE
      to: adminWallet.account.address,
    }, suaveProvider, intentRouterAddress, kettleAddress)

    console.log("orderId", limitOrder.orderId())

    const tx = await limitOrder.toTransactionRequest()
    let limitOrderTxHash: Hex = '0x'
    limitOrderTxHash = await adminWallet.sendTransaction(tx)
    console.log("limitOrderTxHash", limitOrderTxHash)

    let ccrReceipt: TransactionReceiptSuave | null = null

    let fails = 0
    for (let i = 0; i < 10; i++) {
      try {
        ccrReceipt = await suaveProvider.waitForTransactionReceipt({hash: limitOrderTxHash})
        console.log("ccrReceipt logs", ccrReceipt.logs)
        break
      } catch (e) {
        console.warn('error', e)
        if (++fails >= 10) {
          throw new Error('failed to get receipt: timed out')
        }
      }
    }
    if (!ccrReceipt) {
      throw new Error("no receipt (this should never happen)")
    }

    const txRes = await suaveProvider.getTransaction({hash: limitOrderTxHash})
    console.log("txRes", txRes)

    if (txRes.type !== SuaveTxTypes.Suave) {
      throw new Error('expected SuaveTransaction type (0x50)')
    }

    // check `confidentialComputeResult`; should be calldata for `onReceivedIntent`
    const fnSelector: Hex = `0x${IntentsContract.methodIdentifiers['onReceivedIntent((address,address,uint256,uint256,uint256),bytes32,bytes16,uint256)']}`
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

    // this test is extremely sensitive to changes. comment out if/when changing the contract to reduce stress.
    const expectedRawResult = concatHex([fnSelector, expectedData])
    if (!txRes.confidentialComputeResult.startsWith(expectedRawResult.toLowerCase())) {
      throw new Error('expected confidential compute result to be calldata for `onReceivedIntent`')
    }
  
    // check onchain for intent
    const intentResult = await suaveProvider.call({
      account: adminWallet.account.address,
      to: intentRouterAddress,
      data: encodeFunctionData({
        abi: IntentsContract.abi,
        args: [limitOrder.orderId()],
        functionName: 'intentsPending'
      }),
      gasPrice: 10000000000n,
      gas: 42000n,
      type: '0x0'
    })
    console.log('intentResult', intentResult)

    // get dataId from event logs in receipt
    const LIMIT_ORDER_RECEIVED_SIG: Hex = getEventSelector('LimitOrderReceived(bytes32,bytes16,address,address,uint256,uint256)')
    const intentReceivedLog = ccrReceipt.logs.find(log => log.topics[0] === LIMIT_ORDER_RECEIVED_SIG)
    if (!intentReceivedLog) {
      throw new Error('no LimitOrderReceived event found in logs')
    }
    const decodedLog = decodeEventLog({
      abi: IntentsContract.abi,
      ...intentReceivedLog,
    }).args
    console.log("*** decoded log", decodedLog)
    const { dataId } = decodedLog as any
    console.log("dataId", dataId)
    if (!dataId) {
      throw new Error('no dataId found in logs')
    }

    // get user's latst goerli nonce
    const goerliProvider = await createPublicClient({
      chain: goerli,
      transport: http(goerli.rpcUrls.public.http[0]),
    })
    const nonce = await goerliProvider.getTransactionCount({
      address: adminWallet.account.address
    })
    const blockNumber = await goerliProvider.getBlockNumber()

    // fulfill order
    const fulfillIntent = new FulfillIntentRequest({
      orderId: limitOrder.orderId(),
      dataId: dataId,
      txMeta: new TxMeta().withChainId(goerli.id).withNonce(nonce),
      bundleTxs: new Bundle().signedTxs,
      blockNumber: blockNumber + 1n,
    }, suaveProvider, intentRouterAddress, kettleAddress)
    const txRequest = await fulfillIntent.toTransactionRequest()
    console.log("fulfillOrder txRequest", txRequest)

    // send the CCR
    const fulfillIntentTxHash = await adminWallet.sendTransaction(txRequest)
    console.log("fulfillIntentTxHash", fulfillIntentTxHash)

    // wait for tx receipt, then log it
    const fulfillIntentReceipt = await suaveProvider.waitForTransactionReceipt({hash: fulfillIntentTxHash})
    console.log("fulfillIntentReceipt", fulfillIntentReceipt)
}

async function getAmountOut(routerAddress: Hex, goerliProvider: PublicClient) {
  const abiItem = {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'reserveIn', type: 'uint256' },
      { name: 'reserveOut', type: 'uint256' },
    ],
    name: 'getAmountOut',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  }
  const calldata = encodeFunctionData({
    abi: [abiItem],
    args: [
      1n * ETH,
      100n * ETH,
      42000n * ETH,
    ],
    functionName: 'getAmountOut'
  })
  const tx = {
    to: routerAddress,
    data: calldata,
  }
  return await goerliProvider.call(tx)
}

async function main() {
  /* call getAmountOut directly on goerli */
  const goerliProvider = createPublicClient({
    transport: http(goerli.rpcUrls.public.http[0]),
  })
  const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' as Hex
  const goerliAmountOut = await getAmountOut(routerAddress, goerliProvider)
  console.log("goerliAmountOut", goerliAmountOut)

  const suaveWallet = getSuaveWallet({
    privateKey: (config.SUAVE_KEY || DEFAULT_ADMIN_KEY) as Hex,
    transport: http(suaveRigil.rpcUrls.default.http[0]),
  })
  console.log("suaveWallet", suaveWallet.account.address)
  // connect to rigil testnet
  const suaveProvider = getSuaveProvider(http(suaveRigil.rpcUrls.default.http[0]))
  const USERKEY = (config.GOERLI_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80') as Hex
  const userWallet = createWalletClient({
    account: privateKeyToAccount(USERKEY),
    transport: http(goerli.rpcUrls.public.http[0]),
  })
  console.log("userWallet", userWallet.account.address)
  await testIntents(suaveWallet, suaveProvider, USERKEY, TESTNET_KETTLE_ADDRESS)
}

main()
