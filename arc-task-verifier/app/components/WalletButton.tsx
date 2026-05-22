'use client';

import { useState, useEffect } from 'react';
import {
  connectWallet,
  disconnectWallet,
  getChainId,
  getSavedAddress,
  isWalletAvailable,
  isCorrectChain,
  shortenAddress,
  clearSavedAddress,
  ARC_CHAIN_ID,
} from '../lib/wallet';

export default function WalletButton() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = getSavedAddress();
    if (saved) {
      setAddress(saved);
      getChainId().then(setChainId).catch(() => setChainId(null));
    }
  }, []);

  useEffect(() => {
    if (!isWalletAvailable()) return;

    const handleAccountsChanged = (accounts: unknown) => {
      if (Array.isArray(accounts) && accounts.length > 0) {
        const newAddress = (accounts[0] as string).toLowerCase();
        setAddress(newAddress);
        localStorage.setItem('arc_wallet_address', newAddress);
        setError(null);
      } else {
        setAddress(null);
        clearSavedAddress();
        setChainId(null);
      }
      window.dispatchEvent(new CustomEvent('wallet-changed'));
    };

    const handleChainChanged = () => {
      getChainId().then(setChainId).catch(() => setChainId(null));
    };

    const eth = window.ethereum;
    if (eth?.on) {
      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (eth?.removeListener) {
        eth.removeListener('accountsChanged', handleAccountsChanged);
        eth.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const notifyWalletChanged = () => {
    window.dispatchEvent(new CustomEvent('wallet-changed'));
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const result = await connectWallet();
      setAddress(result.address);
      getChainId().then(setChainId).catch(() => setChainId(null));
      notifyWalletChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setAddress(null);
    setChainId(null);
    setError(null);
    notifyWalletChanged();
  };

  const onCorrectChain = chainId !== null && isCorrectChain(chainId);

  return (
    <div className="flex items-center gap-2">
      {address ? (
        <>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-md">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-mono text-indigo-700 dark:text-indigo-300">
              {shortenAddress(address)}
            </span>
          </div>
          {chainId !== null && (
            <span
              className={`px-2 py-1 text-xs rounded-md font-medium ${
                onCorrectChain
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
              }`}
              title={onCorrectChain ? `Arc Testnet (${ARC_CHAIN_ID})` : `Wrong network: ${chainId}`}
            >
              {onCorrectChain ? 'Arc Testnet' : 'Wrong Network'}
            </span>
          )}
          <button
            onClick={handleDisconnect}
            className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Disconnect"
          >
            ✕
          </button>
        </>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {connecting ? 'Connecting...' : !mounted ? 'Connect Wallet' : isWalletAvailable() ? 'Connect Arc Wallet' : 'Wallet Not Detected'}
        </button>
      )}
      {error && (
        <div className="absolute top-full right-0 mt-1 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs rounded-md shadow-lg whitespace-nowrap z-50">
          {error}
        </div>
      )}
    </div>
  );
}
