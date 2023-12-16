import { Address, Hash, Hex, Transport, decodeEventLog, encodeFunctionData, getContract, hexToBigInt } from 'viem';
import { SuaveProvider, SuaveWallet, TransactionReceiptSuave, TransactionRequestSuave } from 'viem/chains/utils';
import SlotsContract from '../contracts/out/Slots.sol/SlotMachines.json';
import CasinoLibContract from '../contracts/out/CasinoLib.sol/CasinoLib.json';

export interface SlotMachineLog {
    slotId: bigint
    pot: bigint
    minBet: bigint
}

export class SlotsClient<T extends Transport> {
    wallet: SuaveWallet<T>
    provider: SuaveProvider<T>
    slotMachinesAddress?: Address
    slotLibAddress?: Address
    kettleAddress: Address
    slotIds: bigint[] = []

    constructor(params: {
        wallet: SuaveWallet<T>,
        provider: SuaveProvider<T>,
        slotMachinesAddress?: Address,
        kettleAddress?: Address,
        slotLibAddress?: Address,
        slotIds?: bigint[],
    }) {
        this.wallet = params.wallet
        this.provider = params.provider
        this.slotMachinesAddress = params.slotMachinesAddress
        this.kettleAddress = params.kettleAddress || "0xb5feafbdd752ad52afb7e1bd2e40432a485bbb7f"
        this.slotLibAddress = params.slotLibAddress
        this.slotIds = params.slotIds || []
    }

    /** Deploy SlotMachines contract and return mutated self with new `slotMachinesAddress`.
     *
     * // TODO: replace self-mutating class with a factory pattern.
     */
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

    async chipsBalance(): Promise<bigint> {
        if (!this.slotMachinesAddress) throw new Error('slot machine must be deployed first')
        const balance = await this.provider.call({
            account: this.wallet.account,
            to: this.slotMachinesAddress,
            data: encodeFunctionData({
                abi: SlotsContract.abi,
                functionName: 'chipsBalance',
                args: [this.wallet.account.address]
            }),
            gasPrice: 1000000000n,
            gas: 26000n,
            type: '0x0',
        })
        if (!balance.data) {
            throw new Error('failed to retrieve chips balance')
        }
        return hexToBigInt(balance.data)
    }

    /** Deposit SUAVE-ETH to buy chips. */
    async buyChips(amount: bigint): Promise<Hash> {
        if (!this.slotMachinesAddress) throw new Error('slot machine must be deployed first')
        const txRequest: TransactionRequestSuave = {
            to: this.slotMachinesAddress,
            data: encodeFunctionData({
                abi: SlotsContract.abi,
                functionName: 'buyChips',
            }),
            type: '0x0',
            value: amount,
            gas: 75000n,
            gasPrice: 1000000000n,
        }
        return await this.wallet.sendTransaction(txRequest)
    }

    /** Cash out chips for SUAVE-ETH. */
    async cashChips(amount: bigint): Promise<Hash> {
        if (!this.slotMachinesAddress) throw new Error('slot machine must be deployed first')
        const txRequest: TransactionRequestSuave = {
            to: this.slotMachinesAddress,
            data: encodeFunctionData({
                abi: SlotsContract.abi,
                functionName: 'cashChips',
                args: [amount],
            }),
            type: '0x0',
            gas: 42000n,
            gasPrice: 1000000000n,
        }
        return await this.wallet.sendTransaction(txRequest)
    }

    /** Initialize a new slot machine, waits for tx receipt. */
    async initSlotMachine(startingPot: bigint, minBet: bigint, winChancePercent: number): Promise<SlotMachineLog> {
        if (!this.slotMachinesAddress) throw new Error('slot machine must be deployed first')
        const balance = await this.provider.getBalance({address: this.wallet.account.address})
        const txRequest: TransactionRequestSuave = {
            to: this.slotMachinesAddress,
            data: encodeFunctionData({
                abi: SlotsContract.abi,
                functionName: 'initSlotMachine',
                args: [minBet, winChancePercent],
            }),
            type: '0x0',
            gas: 175000n,
            gasPrice: 1000000000n,
            value: startingPot,
        }
        const txHash = await this.wallet.sendTransaction(txRequest)
        const initSlotsRes = await this.provider.waitForTransactionReceipt({hash: txHash})
        // decode log from initSlotMachine; expecting only one
        const initLog = initSlotsRes.logs[0]
        const decodedEvent = decodeEventLog({
            abi: SlotsContract.abi,
            ...initLog,
        })
        return decodedEvent.args as SlotMachineLog
    }

    /** Pull lever at given slotId. */
    async pullSlot(slotId: bigint, betAmount: bigint): Promise<Hash> {
        if (!this.slotMachinesAddress) throw new Error('slot machine must be deployed first')
        const txRequest: TransactionRequestSuave = {
            to: this.slotMachinesAddress,
            data: encodeFunctionData({
                abi: SlotsContract.abi,
                functionName: 'pullSlot',
                args: [slotId, betAmount],
            }),
            kettleAddress: this.kettleAddress,
            type: '0x43',
            gas: 499000n,
            gasPrice: 2000000000n,
        }
        return await this.wallet.sendTransaction(txRequest)
    }
}

export function checkSlotPullReceipt(txReceipt: TransactionReceiptSuave) {
    return txReceipt.logs.map(log => decodeEventLog({
        abi: SlotsContract.abi,
        ...log,
        }))
}
