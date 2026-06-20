import { ARC_RPC_URL, ARCSCAN_API_URL } from './config';

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

async function rpcCall(to: string, data: string): Promise<string | null> {
  try {
    const response = await fetch(ARC_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to, data }, 'latest'],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const result = await response.json();
    return result.result ?? null;
  } catch {
    return null;
  }
}

function decodeString(hex: string): string | null {
  // ABI-encoded string: offset (32 bytes) + length (32 bytes) + data
  // Simplified: skip first 64 hex chars (offset + length), read remaining bytes
  if (!hex || hex === '0x') return null;
  try {
    // Remove 0x prefix
    const raw = hex.slice(2);
    if (raw.length < 128) return null; // too short for offset + length + data

    // Read length from position 64 (32 bytes offset)
    const dataLength = parseInt(raw.slice(64, 128), 16);
    if (dataLength === 0) return null;

    // Read data from position 128
    const dataHex = raw.slice(128, 128 + dataLength * 2);
    let str = '';
    for (let i = 0; i < dataHex.length; i += 2) {
      const code = parseInt(dataHex.slice(i, i + 2), 16);
      if (code === 0) break;
      str += String.fromCharCode(code);
    }
    return str || null;
  } catch {
    return null;
  }
}

function decodeUint256(hex: string): string | null {
  if (!hex || hex === '0x') return null;
  try {
    const raw = hex.slice(2);
    if (raw.length < 64) return null;
    const value = BigInt('0x' + raw.slice(0, 64));
    return value.toString();
  } catch {
    return null;
  }
}

function decodeUint8(hex: string): number | null {
  if (!hex || hex === '0x') return null;
  try {
    const raw = hex.slice(2);
    if (raw.length < 64) return null;
    const value = parseInt(raw.slice(62, 64), 16);
    return isNaN(value) ? null : value;
  } catch {
    return null;
  }
}

async function readTokenMetadata(address: string): Promise<{
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
}> {
  const [nameHex, symbolHex, decimalsHex, totalSupplyHex] = await Promise.all([
    rpcCall(address, '0x06fdde03'), // name()
    rpcCall(address, '0x95d89b41'), // symbol()
    rpcCall(address, '0x313ce567'), // decimals()
    rpcCall(address, '0x18160ddd'), // totalSupply()
  ]);

  return {
    name: decodeString(nameHex ?? ''),
    symbol: decodeString(symbolHex ?? ''),
    decimals: decodeUint8(decimalsHex ?? ''),
    totalSupply: decodeUint256(totalSupplyHex ?? ''),
  };
}

export async function scanToken(address: string): Promise<TokenInfo> {
  const foundFunctions: string[] = [];
  const missingFunctions: string[] = [];
  let hasOwnable = false;
  let hasPausable = false;
  let hasMintable = false;

  // Try ArcScan API first
  try {
    const response = await fetch(
      `${ARCSCAN_API_URL}?module=contract&action=getsourcecode&address=${address}`
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

        // Read actual token metadata via RPC
        const metadata = await readTokenMetadata(address);

        return {
          address,
          name: metadata.name,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
          totalSupply: metadata.totalSupply,
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
      const result = await rpcCall(address, sig);
      if (result && result !== '0x') {
        foundFunctions.push(name.split('(')[0]);
      } else {
        missingFunctions.push(name.split('(')[0]);
      }
    }
  } catch {
    // RPC failed
  }

  // If we found enough functions, try to read metadata
  let name: string | null = null;
  let symbol: string | null = null;
  let decimals: number | null = null;
  let totalSupply: string | null = null;

  if (foundFunctions.length >= 4) {
    const metadata = await readTokenMetadata(address);
    name = metadata.name;
    symbol = metadata.symbol;
    decimals = metadata.decimals;
    totalSupply = metadata.totalSupply;
  }

  return {
    address,
    name,
    symbol,
    decimals,
    totalSupply,
    isERC20: foundFunctions.length >= 4,
    missingFunctions,
    hasOwnable,
    hasPausable,
    hasMintable,
  };
}
