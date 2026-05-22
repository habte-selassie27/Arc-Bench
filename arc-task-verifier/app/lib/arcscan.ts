const ARC_RPC_URL = 'https://rpc.testnet.arc.network';

export interface ContractInfo {
  exists: boolean;
  hasCode: boolean;
  isVerified: boolean;
  contractName: string | null;
  abi: object | null;
  error?: string;
}

interface CacheEntry {
  result: ContractInfo;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 60_000;
const MAX_CACHE_SIZE = 100;

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

export function isValidAddress(address: string): boolean {
  const hexRegex = /^0x[a-fA-F0-9]{40}$/;
  return hexRegex.test(address.trim());
}

function getCached(address: string): ContractInfo | null {
  const entry = cache.get(address);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(address);
    return null;
  }
  return entry.result;
}

function setCached(address: string, result: ContractInfo): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(address, { result, timestamp: Date.now() });
}

async function checkContractCodeRPC(address: string): Promise<{ hasCode: boolean } | { error: string }> {
  try {
    const response = await fetch(ARC_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: 1,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { error: 'RPC unavailable' };
    }

    const data = await response.json();
    const code = data.result as string;
    const hasCode = code !== '0x' && code.length > 2;
    return { hasCode };
  } catch {
    return { error: 'RPC unavailable' };
  }
}

export async function fetchContractInfo(address: string): Promise<ContractInfo> {
  const normalized = normalizeAddress(address);

  if (!isValidAddress(normalized)) {
    return { exists: false, hasCode: false, isVerified: false, contractName: null, abi: null, error: 'Invalid address format' };
  }

  const cached = getCached(normalized);
  if (cached) return cached;

  const rpcResult = await checkContractCodeRPC(normalized);

  if ('error' in rpcResult) {
    return { exists: false, hasCode: false, isVerified: false, contractName: null, abi: null, error: rpcResult.error };
  }

  if (!rpcResult.hasCode) {
    const result: ContractInfo = {
      exists: false,
      hasCode: false,
      isVerified: false,
      contractName: null,
      abi: null,
      error: 'No contract deployed at this address',
    };
    setCached(normalized, result);
    return result;
  }

  const baseUrl = 'https://testnet.arcscan.app/api';
  const url = `${baseUrl}?module=contract&action=getsourcecode&address=${normalized}`;

  const fetchWithRetry = async (attempts: number): Promise<ContractInfo> => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

      if (response.status === 429 && attempts > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return fetchWithRetry(attempts - 1);
      }

      if (!response.ok) {
        if (response.status === 404) {
          return { exists: true, hasCode: true, isVerified: false, contractName: null, abi: null, error: 'Contract not found on ArcScan' };
        }
        return { exists: true, hasCode: true, isVerified: false, contractName: null, abi: null, error: 'ArcScan unavailable' };
      }

      const data = await response.json();

      const sources = data.result as Array<Record<string, unknown>> | undefined;
      if (data.status === '0' || !sources || sources.length === 0) {
        return { exists: true, hasCode: true, isVerified: false, contractName: null, abi: null, error: 'Contract not verified on ArcScan' };
      }

      const source = sources[0];

      const hasVerifiedFields =
        (typeof source.SourceCode === 'string' && source.SourceCode.length > 0) ||
        typeof source.ABI === 'string' ||
        typeof source.Abi === 'string' ||
        typeof source.ContractName === 'string';

      if (!hasVerifiedFields) {
        return { exists: true, hasCode: true, isVerified: false, contractName: null, abi: null, error: 'Contract not verified on ArcScan' };
      }

      let parsedAbi: object | null = null;
      let contractName: string | null = null;

      if (source.Abi && typeof source.Abi === 'string') {
        try {
          parsedAbi = JSON.parse(source.Abi);
        } catch {
          parsedAbi = null;
        }
      } else if (source.ABI && typeof source.ABI === 'string') {
        try {
          parsedAbi = JSON.parse(source.ABI);
        } catch {
          parsedAbi = null;
        }
      }

      if (source.ContractName && typeof source.ContractName === 'string') {
        contractName = source.ContractName;
      }

      const result: ContractInfo = {
        exists: true,
        hasCode: true,
        isVerified: true,
        contractName,
        abi: parsedAbi,
      };

      setCached(normalized, result);
      return result;
    } catch {
      return { exists: true, hasCode: true, isVerified: false, contractName: null, abi: null, error: 'ArcScan unavailable' };
    }
  };

  return fetchWithRetry(1);
}

export function clearContractCache(): void {
  cache.clear();
}

export function getContractCacheSize(): number {
  return cache.size;
}
