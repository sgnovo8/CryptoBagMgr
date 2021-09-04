import Web3 from 'web3';
import * as CryptobagsJSON from '../../../build/contracts/Cryptobags.json';
import { Cryptobags } from '../../types/Cryptobags';

const DEFAULT_SEND_OPTIONS = {
    gas: 6000000
};

const DEPLOYED_CONTRACT_ADDRESS = '0xAFb93EF21bC061a88afB539d5fdD926DB942869A';
export class CryptobagsWrapper {
    web3: Web3;

    contract: Cryptobags;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.address = DEPLOYED_CONTRACT_ADDRESS;
        this.contract = new web3.eth.Contract(CryptobagsJSON.abi as any) as any;
        this.contract.options.address = DEPLOYED_CONTRACT_ADDRESS;
    }

    get isDeployed() {
        return Boolean(this.address);
    }

    async getTotalCryptobags(fromAddress: string) {
        const data = await this.contract.methods.totalCryptobags().call({ from: fromAddress });

        return parseInt(data, 10);
    }

    async getCryptobags(id: number, fromAddress: string) {
        const data = await this.contract.methods.cryptobag(id).call({ from: fromAddress });

        const newCryptobags = {
            id: Number(data.id),
            name: data.name,
            songs: Number(data.coins),
            creator: data.creator
        };
        return newCryptobags;
    }

    async createCryptobags(name: string, fromAddress: string) {
        const tx = await this.contract.methods.createCryptobags(name).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress
        });

        return tx;
    }

    async addSongToCryptobags(name: string, cryptobagId: number, fromAddress: string) {
        const tx = await this.contract.methods.addCoinToCryptobags(name, cryptobagId).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress
        });

        return tx;
    }

    async getCryptobagsCoins(cryptobagsId: number, fromAddress: string) {
        const data = await this.contract.methods.getCryptobagsCoins(cryptobagId).call({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress
        });

        return data;
    }

    // async deploy(fromAddress: string) {
    //     const tx = this.contract
    //         .deploy({
    //             data: CryptobagsJSON.bytecode,
    //             arguments: []
    //         })
    //         .send({
    //             ...DEFAULT_SEND_OPTIONS,
    //             from: fromAddress
    //         });

    //     let transactionHash: string = null;
    //     tx.on('transactionHash', (hash: string) => {
    //         transactionHash = hash;
    //     });

    //     const contract = await tx;

    //     this.useDeployed(contract.options.address);

    //     return transactionHash;
    // }

    // useDeployed(contractAddress: string) {
    //     this.address = contractAddress;
    //     this.contract.options.address = contractAddress;
    // }
}
