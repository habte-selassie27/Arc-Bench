'use client';

import { useState } from 'react';
import type { DeployStatus } from '../lib/types';

interface Props {
  solSource: string;
  contractName: string;
  walletAddress: string | null;
}

export default function DeployButton({ solSource, contractName, walletAddress }: Props) {
  const [deploying, setDeploying] = useState(false);
  const [status, setStatus] = useState<DeployStatus | null>(null);

  const handleDeploy = async () => {
    if (!walletAddress) return;
    setDeploying(true);
    setStatus(null);
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solSource, contractName, walletAddress }),
      });
      const data = await res.json();
      setStatus(data);
      if (data.id) {
        const poll = setInterval(async () => {
          const pollRes = await fetch(`/api/deploy?id=${data.id}`);
          const pollData = await pollRes.json();
          setStatus(pollData);
          if (pollData.status === 'confirmed' || pollData.status === 'failed') {
            clearInterval(poll);
          }
        }, 2000);
      }
    } catch {
      setStatus({ id: '', status: 'failed', error: 'Deploy request failed', timestamp: Date.now() });
    } finally {
      setDeploying(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    compiling: 'bg-blue-100 text-blue-800',
    deploying: 'bg-purple-100 text-purple-800',
    confirmed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleDeploy}
        disabled={deploying || !walletAddress}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm"
      >
        {deploying ? 'Deploying...' : 'Deploy to Arc Testnet ⚡'}
      </button>
      {!walletAddress && <p className="text-xs text-gray-500 mt-1">Connect wallet first</p>}

      {status && (
        <div className={`mt-2 px-3 py-2 rounded text-sm ${statusColors[status.status] || 'bg-gray-100'}`}>
          <p className="font-semibold">Status: {status.status}</p>
          {status.txHash && <p className="text-xs font-mono mt-1">Tx: {status.txHash.slice(0, 20)}...</p>}
          {status.contractAddress && (
            <p className="text-xs font-mono mt-1">
              Contract:{' '}
              <a href={`https://testnet.arcscan.app/address/${status.contractAddress}`} target="_blank" rel="noopener noreferrer" className="underline">
                {status.contractAddress.slice(0, 20)}...
              </a>
            </p>
          )}
          {status.error && <p className="text-xs mt-1">Error: {status.error}</p>}
        </div>
      )}
    </div>
  );
}
