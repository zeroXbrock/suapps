import { Address, Hash, Hex, Transport, encodeFunctionData } from 'viem';
import { SuaveProvider, SuaveWallet, TransactionRequestSuave } from 'viem/chains/utils';
import SlotsContract from '../contracts/out/Slots.sol/SlotMachines.json';
import CasinoLibContract from '../contracts/out/CasinoLib.sol/CasinoLib.json';

export class SlotsClient<T extends Transport> {
    wallet: SuaveWallet<T>
    provider: SuaveProvider<T>
    slotMachinesAddress?: Address
    slotLibAddress?: Address
    kettleAddress: Address

    constructor(params: {
        wallet: SuaveWallet<T>,
        provider: SuaveProvider<T>,
        slotMachinesAddress?: Address,
        kettleAddress?: Address,
        slotLibAddress?: Address,
    }) {
        this.wallet = params.wallet
        this.provider = params.provider
        this.slotMachinesAddress = params.slotMachinesAddress
        this.kettleAddress = params.kettleAddress || "0xb5feafbdd752ad52afb7e1bd2e40432a485bbb7f"
        this.slotLibAddress = params.slotLibAddress
    }

    /** Deploy SlotMachines contract and return address, as well as update the class instance variable. */
    async deploy(): Promise<this> {
        if (!this.slotLibAddress) {
            console.log("deploying casino lib...")
            // deploy slot lib
            const deployLibTxHash = await this.wallet.deployContract({
                abi: CasinoLibContract.abi,
                bytecode: CasinoLibContract.bytecode.object as Hex,
            })
            const deployLibReceipt = await this.provider.waitForTransactionReceipt({hash: deployLibTxHash})
            if (!deployLibReceipt.contractAddress) throw new Error('no contract address for SlotLib')
            this.slotLibAddress = deployLibReceipt.contractAddress
            console.log("deployed", this.slotLibAddress)
        } else [
            console.log('using existing slot lib', this.slotLibAddress)
        ]
        console.log("deploying slot machine...")
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
        console.log("deployed", this.slotMachinesAddress)
        return this
    }

    /** Initialize a new slot machine. */
    async initSlotMachine(minBet: bigint): Promise<Hash> {
        if (!this.slotMachinesAddress) throw new Error('slot machine must be deployed first')
        const txRequest: TransactionRequestSuave = {
            to: this.slotMachinesAddress,
            data: encodeFunctionData({
                abi: SlotsContract.abi,
                functionName: 'initSlotMachine',
                args: [minBet],
            }),
            kettleAddress: this.kettleAddress,
            type: '0x43',
            gas: 175000n,
            gasPrice: 1000000000n,
        }
        return await this.wallet.sendTransaction(txRequest)
    }

    /** Pull lever at given slotId. */
    async pullSlot(slotId: bigint): Promise<Hash> {
        if (!this.slotMachinesAddress) throw new Error('slot machine must be deployed first')
        const txRequest: TransactionRequestSuave = {
            to: this.slotMachinesAddress,
            data: encodeFunctionData({
                abi: SlotsContract.abi,
                functionName: 'pullSlot',
                args: [slotId],
            }),
            kettleAddress: this.kettleAddress,
            type: '0x43',
            gas: 75000n,
            gasPrice: 1000000000n,
        }
        return await this.wallet.sendTransaction(txRequest)
    }
}

