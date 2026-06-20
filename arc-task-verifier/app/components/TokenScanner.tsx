'use client';

import { useState } from 'react';
import type { TokenInfo } from '../lib/types';

export default function TokenScanner() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TokenInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address.trim())) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/erc20', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Scan failed');
      }
      setResult(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">ERC-20 Token Scanner</h3>
      <div className="flex gap-2">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
          className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm font-mono"
        />
        <button
          onClick={handleScan}
          disabled={loading || !/^0x[a-fA-F0-9]{40}$/.test(address.trim())}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
        >
          {loading ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {result && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm">
          <p className="font-semibold mb-2">
            {result.isERC20 ? '✅ ERC-20 Token' : '❌ Not ERC-20'}
          </p>
          <div className="space-y-1">
            {result.name && <p>Name: {result.name}</p>}
            {result.symbol && <p>Symbol: {result.symbol}</p>}
            {result.decimals !== null && <p>Decimals: {result.decimals}</p>}
            <p>Ownable: {result.hasOwnable ? '✅' : '❌'}</p>
            <p>Pausable: {result.hasPausable ? '✅' : '❌'}</p>
            <p>Mintable: {result.hasMintable ? '✅' : '❌'}</p>
            {result.missingFunctions.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500">Missing standard functions:</p>
                {result.missingFunctions.map(f => <p key={f} className="text-xs text-red-400">{f}</p>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
