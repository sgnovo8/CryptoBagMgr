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

import { PlaylistsWrapper } from '../lib/contracts/PlaylistsWrapper';
import { CONFIG } from '../config';
import { IPlaylist, ISong } from '../types/Playlist.d';

const DEPLOYED_CONTRACT_ADDRESS = '0xAFb93EF21bC061a88afB539d5fdD926DB942869A';
const MIN_PLAYLIST_ID = 1;

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
    const [contract, setContract] = useState<PlaylistsWrapper>();
    const [accounts, setAccounts] = useState<string[]>();
    const [l2Balance, setL2Balance] = useState<bigint>();
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const toastId = React.useRef(null);
    const [currentPlaylistName, setCurrentPlaylistName] = useState<string>();
    const [currentSongName, setCurrentSongName] = useState<string>();
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<number>(MIN_PLAYLIST_ID);
    const [playlist, setPlaylist] = useState<IPlaylist[]>();
    const [currentSongList, setCurrentSongList] = useState<ISong[]>();
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
        if (contract && account) getPlaylists();
    }, [contract, account]);

    useEffect(() => {
        if (playlist && playlist.length > 1) {
            getPlaylistSongs();
        }
    }, [playlist]);

    async function getPlaylists() {
        const total = Number(await contract.getTotalPlaylist(account));
        const newPlaylist = [];
        for (let i = MIN_PLAYLIST_ID; i <= total; i++) {
            const singlePlaylist = await contract.getPlaylist(i, account);
            newPlaylist.push(singlePlaylist);
        }
        setPlaylist(newPlaylist);
        // toast('Successfully read latest stored value.', { type: 'success' });
    }

    async function getPlaylistSongs() {
        setCurrentSongList(undefined);
        setLoading(true);
        const songList = await contract.getPlaylistSongs(selectedPlaylistId, account);
        const editedSongList = [];
        for (const song of songList) {
            const newSong = { id: song[0], playlistId: song[1], name: song[2], creator: song[3] };
            editedSongList.push(newSong);
        }
        console.log(songList);
        setCurrentSongList(editedSongList);
        setLoading(false);
        // toast('Successfully read latest stored value.', { type: 'success' });
    }

    const createPlaylist = async () => {
        if (!currentPlaylistName) return;
        try {
            setTransactionInProgress(true);
            await contract.createPlaylist(currentPlaylistName, account);
            await getPlaylists();
            toast('Playlist created successfully 🎵', { type: 'success' });
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    };

    const addSongToPlaylist = async () => {
        if (!currentSongName) return;

        try {
            setTransactionInProgress(true);
            await contract.addSongToPlaylist(currentSongName, selectedPlaylistId, account);
            getPlaylistSongs();
            toast('Song added to playlist successfully 🎵', { type: 'success' });
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
            const _contract = new PlaylistsWrapper(_web3);
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
            <h1>🎼 Playlist Manager </h1>
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
            Playlist Contract Address :<b>{DEPLOYED_CONTRACT_ADDRESS}</b>
            <hr />
            <br />
            <br />
            <div>😃 Create new playlists and add songs to them</div>
            <br />
            <br />
            <div className="create-playlist">
                <input
                    placeholder="Playlist name"
                    value={currentPlaylistName}
                    onChange={e => setCurrentPlaylistName(e.target.value)}
                />

                <button onClick={createPlaylist}> Create Playlist </button>
            </div>
            <br />
            <br />
            <br />
            <br />
            <div className="show-playlist">
                <label htmlFor="pl">Choose a playlist:</label>

                <select
                    name="pl"
                    id="pl"
                    onChange={e => setSelectedPlaylistId(Number(e.target.value))}
                >
                    {playlist?.map(pl => (
                        <option key={pl.id} value={pl.id}>
                            {pl.name}
                        </option>
                    ))}
                </select>

                <button onClick={getPlaylistSongs}>Show Playlist Songs</button>
            </div>
            <br />
            <div className="show-songs">
                {!currentSongList ||
                    (currentSongList.length < 1 && <small>No song found! Add first song</small>)}
                {loading && <LoadingIndicator />}
                <ul>
                    {currentSongList?.map(song => (
                        <li key={song.id}>{song.name}</li>
                    ))}
                </ul>
                <input
                    placeholder="Song name"
                    onChange={e => setCurrentSongName(e.target.value)}
                    value={currentSongName}
                />
                <button onClick={addSongToPlaylist}>Create Song</button>
            </div>
            <ToastContainer />
        </div>
    );
}
