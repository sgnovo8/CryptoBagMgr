/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { ToastContainer, toast } from 'react-toastify';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';

import { CryptobagsWrapper } from '../lib/contracts/CryptobagsWrapper';
import { CONFIG } from '../config';
import { ICryptobags, ICoin } from '../types/Cryptobags.d';

const DEPLOYED_CONTRACT_ADDRESS = '0xAFb93EF21bC061a88afB539d5fdD926DB942869A';
const MIN_CRYPTOBAGS_ID = 1;

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };

        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider || Web3.givenProvider);

        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<CryptobagsWrapper>();
    const [accounts, setAccounts] = useState<string[]>();
    const [l2Balance, setL2Balance] = useState<bigint>();
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const toastId = React.useRef(null);
    const [currentCryptobagsName, setCurrentCryptobagsName] = useState<string>();
    const [currentCoinName, setCurrentCoinName] = useState<string>();
    const [selectedCryptobagId, setSelectedCryptobagId] = useState<number>(MIN_CRYPTOBAG_ID);
    const [cryptobags, setCryptobags] = useState<ICryptobags[]>();
    const [currentCoinList, setCurrentCoinList] = useState<ICoin[]>();
    const [loading, setLoading] = useState<boolean>();

    useEffect(() => {
        if (accounts?.[0]) {
            const addressTranslator = new AddressTranslator();
            setPolyjuiceAddress(addressTranslator.ethAddressToGodwokenShortAddress(accounts?.[0]));
        } else {
            setPolyjuiceAddress(undefined);
        }
    }, [accounts?.[0]]);

    useEffect(() => {
        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [transactionInProgress, toastId.current]);

    const account = accounts?.[0];

    useEffect(() => {
        if (contract && account) getCryptobags();
    }, [contract, account]);

    useEffect(() => {
        if (cryptobag && cryptobag.length > 1) {
            getCryptobagCoins();
        }
    }, [cryptobag]);

    async function getCryptobags() {
        const total = Number(await contract.getTotalCryptobag(account));
        const newCryptobag = [];
        for (let i = MIN_CRYPTOBAG_ID; i <= total; i++) {
            const singleCryptobag = await contract.getCryptobag(i, account);
            newCryptobag.push(singleCryptobag);
        }
        setCryptobag(newCryptobag);
        // toast('Successfully read latest stored value.', { type: 'success' });
    }

    async function getCryptobagCoins() {
        setCurrentCoinList(undefined);
        setLoading(true);
        const coinList = await contract.getCryptobagCoins(selectedcryptobagId, account);
        const editedCoinList = [];
        for (const coin of coinList) {
            const newCoin = { id: coin[0], cryptobagId: coin[1], name: coin[2], creator: coin[3] };
            editedCoinList.push(newCoin);
        }
        console.log(coinList);
        setCurrentCoinList(editedCoinList);
        setLoading(false);
        // toast('Successfully read latest stored value.', { type: 'success' });
    }

    const createCryptobag = async () => {
        if (!currentCryptobagName) return;
        try {
            setTransactionInProgress(true);
            await contract.createCryptobag(currentCryptobagName, account);
            await getCryptobags();
            toast('Cryptobag created successfully ', { type: 'success' });
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    };

    const addCoinToCryptobag = async () => {
        if (!currentCoinName) return;

        try {
            setTransactionInProgress(true);
            await contract.addCoinToCryptobag(currentCoinName, selectedcryptobagId, account);
            getCryptobagCoins();
            toast('Coin added to playlist successfully ', { type: 'success' });
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    };

    useEffect(() => {
        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);

            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            console.log({ _accounts });
            const _contract = new CryptobagsWrapper(_web3);
            setContract(_contract);
            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setL2Balance(_l2Balance);
            }
        })();
    });

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    return (
        <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
            <h1> Cryptobag Manager </h1>
            Your ETH address: <b>{accounts?.[0]}</b>
            <br />
            <br />
            Your Polyjuice address: <b>{polyjuiceAddress || ' - '}</b>
            <br />
            <br />
            Nervos Layer 2 balance:{' '}
            <b>{l2Balance ? (l2Balance / 10n ** 8n).toString() : <LoadingIndicator />} CKB</b>
            <br />
            <br />
            <br />
            Cryptobag Contract Address :<b>{DEPLOYED_CONTRACT_ADDRESS}</b>
            <hr />
            <br />
            <br />
            <div> Create new cryptobags and add coins to them</div>
            <br />
            <br />
            <div className="create-cryptobag">
                <input
                    placeholder="Cryptobag name"
                    value={currentCryptobagName}
                    onChange={e => setCurrentCryptobagName(e.target.value)}
                />

                <button onClick={createCryptobag}> Create Cryptobag </button>
            </div>
            <br />
            <br />
            <br />
            <br />
            <div className="show-cryptobag">
                <label htmlFor="pl">Choose a cryptobag:</label>

                <select
                    name="pl"
                    id="pl"
                    onChange={e => setSelectedCryptobagId(Number(e.target.value))}
                >
                    {cryptobag?.map(pl => (
                        <option key={pl.id} value={pl.id}>
                            {pl.name}
                        </option>
                    ))}
                </select>

                <button onClick={getCryptobagCoins}>Show Cryptobag Coins</button>
            </div>
            <br />
            <div className="show-coins">
                {!currentSongList ||
                    (currentCoinList.length < 1 && <small>No coin found! Add first coin</small>)}
                {loading && <LoadingIndicator />}
                <ul>
                    {currentCoinList?.map(coin => (
                        <li key={coin.id}>{coin.name}</li>
                    ))}
                </ul>
                <input
                    placeholder="Coin name"
                    onChange={e => setCurrentCoinName(e.target.value)}
                    value={currentCoinName}
                />
                <button onClick={addCoinToCryptobag}>Create Coin</button>
            </div>
            <ToastContainer />
        </div>
    );
}
