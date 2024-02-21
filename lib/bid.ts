import {
	Address,
	Hex,
	encodeAbiParameters,
	encodeFunctionData,
	toHex,
} from "@flashbots/suave-viem";
import { suaveRigil } from "@flashbots/suave-viem/chains";
import { TransactionRequestSuave } from "@flashbots/suave-viem/chains/utils";
import MevShareBidContract from "../contracts/out/bids.sol/MevShareBidContract.json";

/** Helper class to create MEV-Share bids on SUAVE. */
export class MevShareBid {
	allowedPeekers: Address[];
	allowedStores: Address[];
	blockNumber: bigint;
	signedTx: Hex;
	mevShareContract: Address;
	kettle: Address;
	chainId: number;

	constructor(
		blockNumber: bigint,
		signedTx: Hex,
		kettle: Address,
		mevShareContract: Address,
		chainId: number,
	) {
		this.blockNumber = blockNumber;
		this.signedTx = signedTx;
		this.kettle = kettle;
		this.mevShareContract = mevShareContract;
		this.chainId = chainId;
		this.allowedPeekers = [
			// no idea what I'm doing here
			suaveRigil.contracts.ANYALLOWED.address,
		];
		this.allowedStores = [];
	}

	/** Encodes calldata to call the `newBid` function. */
	private newBidCalldata() {
		return encodeFunctionData({
			abi: MevShareBidContract.abi,
			functionName: "newBid",
			args: [this.blockNumber, this.allowedPeekers, this.allowedStores],
		});
	}

	/** Wraps `signedTx` in a bundle, then ABI-encodes it as bytes for `confidentialInputs`. */
	private confidentialInputsBytes(): Hex {
		const bundleBytes = toHex(
			JSON.stringify({
				txs: [this.signedTx],
				revertingHashes: [],
			}),
		);
		return encodeAbiParameters([{ type: "bytes" }], [bundleBytes]);
	}

	/** Encodes this bid as a ConfidentialComputeRequest, which can be sent to SUAVE. */
	toConfidentialRequest(): TransactionRequestSuave {
		return {
			to: this.mevShareContract,
			data: this.newBidCalldata(),
			type: "0x43",
			gas: 500000n,
			gasPrice: 1000000000n,
			chainId: this.chainId,
			kettleAddress: this.kettle,
			confidentialInputs: this.confidentialInputsBytes(),
		};
	}
}
