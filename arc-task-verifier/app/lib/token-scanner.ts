import type { EvaluationResult } from './evaluator';
import type { ScoreBreakdown } from './scoring';

export interface TokenInfo {
  address: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
  isERC20: boolean;
  missingFunctions: string[];
  hasOwnable: boolean;
  hasPausable: boolean;
  hasMintable: boolean;
}

const ERC20_REQUIRED = [
  'totalSupply',
  'balanceOf',
  'transfer',
  'transferFrom',
  'approve',
  'allowance',
];

const ERC20_SIGNATURES: Record<string, string> = {
  '0x18160ddd': 'totalSupply()',
  '0x70a08231': 'balanceOf(address)',
  '0xa9059cbb': 'transfer(address,uint256)',
  '0x23b872dd': 'transferFrom(address,address,uint256)',
  '0x095ea7b3': 'approve(address,uint256)',
  '0xdd62ed3e': 'allowance(address,address)',
  '0x313ce567': 'decimals()',
  '0x95d89b41': 'symbol()',
  '0x06fdde03': 'name()',
};

export async function scanToken(address: string): Promise<TokenInfo> {
  const foundFunctions: string[] = [];
  const missingFunctions: string[] = [];
  let hasOwnable = false;
  let hasPausable = false;
  let hasMintable = false;

  // Try ArcScan API
  try {
    const response = await fetch(
      `https://testnet.arcscan.app/api?module=contract&action=getsourcecode&address=${address}`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.status === '1' && data.result?.[0]?.ABI) {
        const abi: Array<{ name?: string; type: string }> = JSON.parse(data.result[0].ABI);
        const functions = abi.filter(f => f.type === 'function').map(f => f.name || '');

        for (const sig of Object.values(ERC20_SIGNATURES)) {
          const funcName = sig.split('(')[0];
          if (functions.includes(funcName)) {
            foundFunctions.push(funcName);
          } else {
            missingFunctions.push(funcName);
          }
        }

        hasOwnable = functions.includes('owner') || functions.includes('transferOwnership');
        hasPausable = functions.includes('pause') || functions.includes('unpause');
        hasMintable = functions.includes('mint');

        return {
          address,
          name: functions.includes('name') ? 'Found in ABI' : null,
          symbol: functions.includes('symbol') ? 'Found in ABI' : null,
          decimals: null,
          totalSupply: null,
          isERC20: foundFunctions.length >= 4,
          missingFunctions,
          hasOwnable,
          hasPausable,
          hasMintable,
        };
      }
    }
  } catch {
    // Fall through to RPC
  }

  // Fall back to checking via RPC signatures
  try {
    for (const [sig, name] of Object.entries(ERC20_SIGNATURES)) {
      const rpcResponse = await fetch('https://rpc.testnet.arc.network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{
            to: address,
            data: sig,
          }, 'latest'],
        }),
      });

      if (rpcResponse.ok) {
        const result = await rpcResponse.json();
        if (result.result && result.result !== '0x') {
          foundFunctions.push(name.split('(')[0]);
        } else {
          missingFunctions.push(name.split('(')[0]);
        }
      }
    }
  } catch {
    // RPC failed
  }

  return {
    address,
    name: null,
    symbol: null,
    decimals: null,
    totalSupply: null,
    isERC20: foundFunctions.length >= 4,
    missingFunctions,
    hasOwnable,
    hasPausable,
    hasMintable,
  };
}
