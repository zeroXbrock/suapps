import {
    Address,
    Hash,
    Hex,
    TransactionLegacy,
    TransactionRequestLegacy,
    Transport,
    encodeAbiParameters,
    encodeFunctionData,
    keccak256,
    parseAbi
} from 'viem'
import {
    SuaveProvider,
    SuaveTxRequestTypes,
    SuaveWallet,
    TransactionRequestSuave
} from 'viem/chains/utils'
import IntentsContract from '../contracts/out/Intents.sol/Intents.json'
import UniV2SwopLibContract from '../contracts/out/SwopLib.sol/UniV2Swop.json'

export const TX_PLACEHOLDER: Hex = '0xf00d'

export type ITxMeta = {
    gas: bigint
    gasPrice: bigint
    nonce: number
    chainId: number
}

class TxMeta implements ITxMeta {
    gas: bigint
    gasPrice: bigint
    nonce: number
    chainId: number
    constructor() {
        this.gas = 150000n
        this.gasPrice = 10000000000n
        this.nonce = 0
        this.chainId = 1
    }

    withChainId(chainId: number): this {
        this.chainId = chainId
        return this
    }

    withGas(gas: bigint): this {
        this.gas = gas
        return this
    }

    withGasPrice(gasPrice: bigint): this {
        this.gasPrice = gasPrice
        return this
    }

    withNonce(nonce: number): this {
        this.nonce = nonce
        return this
    }

    abiData(): [bigint, bigint, bigint, bigint] {
        return [
            BigInt(this.chainId),
            this.gas,
            this.gasPrice,
            BigInt(this.nonce),
        ]
    }
}

export interface IFulfillIntentRequest {
    // for `fulfillIntent(bytes32 orderId, Suave.DataId dataId, memory txMeta)`
    orderId: Hash
    dataId: Hex // bytes16
    txMeta: TxMeta
    // confidential input
    bundle: Hex[]
}

export class FulfillIntentRequest<T extends Transport> implements IFulfillIntentRequest {
    // client configs
    client: SuaveProvider<T>
    contractAddress: Address
    kettleAddress: Address
    // request params
    orderId: Hash
    dataId: Hex
    txMeta: TxMeta
    // confidential input
    bundle: Hex[]

    constructor(params: IFulfillIntentRequest, client: SuaveProvider<T>, contractAddress: Address, kettleAddress: Address) {
        this.client = client
        this.contractAddress = contractAddress
        this.kettleAddress = kettleAddress
        this.orderId = params.orderId
        this.dataId = params.dataId
        this.txMeta = params.txMeta
        this.bundle = params.bundle

        if (!params.bundle.includes(TX_PLACEHOLDER)) {
            throw new Error(`bundle must include tx placeholder: "${TX_PLACEHOLDER}"`)
        }
    }

    async toTransactionRequest(): Promise<TransactionRequestSuave> {
        const feeData = await this.client.getFeeHistory({blockCount: 1, rewardPercentiles: [51]})
        return {
            to: this.contractAddress,
            data: this.calldata(),
            confidentialInputs: this.confidentialInputsBytes(),
            kettleAddress: this.kettleAddress,
            gasPrice: feeData.baseFeePerGas[0] || 10000000000n,
            gas: 150000n,
            type: SuaveTxRequestTypes.ConfidentialRequest,
        }
    }

    private confidentialInputsBytes(): Hex {
        return encodeAbiParameters([
            {type: 'bytes[]'}
        ], [
            this.bundle
        ])
    }

    private calldata(): Hex {
        return encodeFunctionData({
            abi: parseAbi(['function fulfillIntent(bytes32,bytes16,(uint64,uint256,uint256,uint64)) public']),
            args: [
                this.orderId,
                this.dataId,
                this.txMeta.abiData(),
            ],
            functionName: 'fulfillIntent'
        })
    }
}
