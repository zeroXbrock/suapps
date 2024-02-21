import {
    Address,
    Hex,
    Transport,
    encodeAbiParameters,
    encodeFunctionData,
    keccak256,
    parseAbi
} from '@flashbots/suave-viem'
import {
    SuaveProvider,
    SuaveTxRequestTypes,
    SuaveWallet,
    TransactionRequestSuave
} from '@flashbots/suave-viem/chains/utils'
import IntentsContract from '../contracts/out/Intents.sol/Intents.json'
import UniV2SwopLibContract from '../contracts/out/SwopLib.sol/UniV2Swop.json'

export interface ILimitOrder {
    tokenIn: Address
    tokenOut: Address
    amountInMax: bigint
    amountOutMin: bigint
    expiryTimestamp: bigint
    to: Address
    senderKey: Hex
}

export async function deployLimitOrderManager<T extends Transport>(wallet: SuaveWallet<T>, provider: SuaveProvider<T>): Promise<Address> {
    // TODO: pre-calculate contract addresses so we don't have to wait for receipts
    // deploy UniV2Swop lib
    // console.log("deploying UniV2Swop lib")
    // const deployUniV2SwopHash = await wallet.deployContract({
    //     abi: UniV2SwopLibContract.abi,
    //     bytecode: UniV2SwopLibContract.bytecode.object as Hex,
    // })
    // const deployUniV2SwopReceipt = await provider.waitForTransactionReceipt({ hash: deployUniV2SwopHash })
    // if (!deployUniV2SwopReceipt.contractAddress) throw new Error('no contract address for SwopLib')
    // console.log("FINISHED deploying UniV2Swop lib")

    // deploy LimitOrderManager
    console.log("deploying LimitOrderManager")
    const deployContractTxHash = await wallet.deployContract({
        abi: IntentsContract.abi,
        bytecode: IntentsContract.bytecode.object as Hex,
        // .replace(
        //     '__$3e2a51d11424ff2a9c7aaa6bf512430723$__',
        //     deployUniV2SwopReceipt.contractAddress.slice(2)
        //     ) as Hex,
            // .replace('__$2545de99d8fb09dcb15d685d852175cb4a$__', )
        
    })
    const deployContractReceipt = await provider.waitForTransactionReceipt({ hash: deployContractTxHash })
    console.log("FINISHED deploying LimitOrderManager")

    // Return the contract address from the receipt
    if (!deployContractReceipt.contractAddress) throw new Error('no contract address')
    return deployContractReceipt.contractAddress
}
/*
async deploy(): Promise<this> {
    if (!this.slotLibAddress) {
        // deploy slot lib
        const deployLibTxHash = await this.wallet.deployContract({
            abi: CasinoLibContract.abi,
            bytecode: CasinoLibContract.bytecode.object as Hex,
        })
        const deployLibReceipt = await this.provider.waitForTransactionReceipt({hash: deployLibTxHash})
        if (!deployLibReceipt.contractAddress) throw new Error('no contract address for SlotLib')
        this.slotLibAddress = deployLibReceipt.contractAddress
    } else [
        console.log('using existing slot lib', this.slotLibAddress)
    ]
    const libHashPlaceholder = '__$6eae81b6ed3e33d3852c93ab8dab0df069$__'
    const deployContractTxHash = await this.wallet.deployContract({
        abi: SlotsContract.abi,
        // TODO: replace this with a library link
        // replace placeholder with lib address (0x sliced)
        bytecode: SlotsContract.bytecode.object.replace(libHashPlaceholder, this.slotLibAddress.slice(2)) as Hex,
    })
    const deployContractReceipt = await this.provider.waitForTransactionReceipt({hash: deployContractTxHash})
    if (!deployContractReceipt.contractAddress) throw new Error('no contract address')
    this.slotMachinesAddress = deployContractReceipt.contractAddress
    return this
}
*/

export class LimitOrder<T extends Transport> implements ILimitOrder {
    // ILimitOrder fields
    tokenIn: Address
    tokenOut: Address
    amountInMax: bigint
    amountOutMin: bigint
    expiryTimestamp: bigint
    senderKey: Hex
    // client configs
    client: SuaveProvider<T>
    contractAddress: Address
    kettleAddress: Address
    to: Address

    constructor(params: ILimitOrder, client: SuaveProvider<T>, contractAddress: Address, kettleAddress: Address) {
        this.tokenIn = params.tokenIn
        this.tokenOut = params.tokenOut
        this.amountInMax = params.amountInMax
        this.amountOutMin = params.amountOutMin
        this.expiryTimestamp = params.expiryTimestamp
        this.senderKey = params.senderKey
        this.client = client
        this.contractAddress = contractAddress
        this.kettleAddress = kettleAddress
        this.to = params.to
    }

    inner(): ILimitOrder {
        // return {
        //     tokenIn: this.tokenIn,
        //     tokenOut: this.tokenOut,
        //     amountInMax: this.amountInMax,
        //     amountOutMin: this.amountOutMin,
        //     expiryTimestamp: this.expiryTimestamp,
        //     senderKey: this.senderKey,
        //     to: this.to,
        // }
        return this as ILimitOrder // idk if type coercion is actually necessary but hey why not
    }

    orderId(): Hex {
        return keccak256(this.publicBytes())
    }

    // TODO: ideally we'd extend PublicClient to create LimitOrders, then we could
    // just use the class' client instance
    async toTransactionRequest(): Promise<TransactionRequestSuave> {
        const feeData = await this.client.getFeeHistory({blockCount: 1, rewardPercentiles: [51]})
        return {
            to: this.contractAddress,
            data: this.newOrderCalldata(),
            confidentialInputs: this.confidentialInputsBytes(),
            kettleAddress: this.kettleAddress,
            gasPrice: feeData.baseFeePerGas[0] || 10000000000n,
            gas: 150000n,
            type: SuaveTxRequestTypes.ConfidentialRequest,
        }
    }

    private confidentialInputsBytes(): Hex {
        return encodeAbiParameters([
            {type: 'address', name: 'tokenIn'},
            {type: 'address', name: 'tokenOut'},
            {type: 'uint256', name: 'amountIn'},
            {type: 'uint256', name: 'amountOutMin'},
            {type: 'uint256', name: 'expiryTimestamp'},
            {type: 'address', name: 'to'},
            {type: 'bytes32', name: 'senderKey'},
        ], [
            this.tokenIn,
            this.tokenOut,
            this.amountInMax,
            this.amountOutMin,
            this.expiryTimestamp,
            this.to,
            this.senderKey,
        ])
    }

    private publicBytes(): Hex {
        return encodeAbiParameters([
            {type: 'address', name: 'tokenIn'},
            {type: 'address', name: 'tokenOut'},
            {type: 'uint256', name: 'amountIn'},
            {type: 'uint256', name: 'amountOutMin'},
            {type: 'uint256', name: 'expiryTimestamp'},
        ], [
            this.tokenIn,
            this.tokenOut,
            this.amountInMax,
            this.amountOutMin,
            this.expiryTimestamp,
        ])
    }

    private newOrderCalldata(): Hex {
        return encodeFunctionData({
            abi: parseAbi(['function sendIntent() public']),
            // args: [],
            functionName: 'sendIntent'
          })
    }
}
