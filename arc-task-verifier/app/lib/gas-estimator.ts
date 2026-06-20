import { ARC_RPC_URL } from './config';

export interface GasEstimate {
  gasUnits: number;
  gasPriceGwei: string;
  usdcCost: string;
  breakdown: string[];
  isLive: boolean;
}

export const MIN_GAS = 21_000;
export const MAX_BYTECODE_SIZE = 24_576;
export const DEPLOY_GAS_PER_BYTE = 200;
export const BASE_DEPLOY_GAS = 21_000;

const FALLBACK_GAS_PRICE_GWEI = '0.001';
const FALLBACK_GAS_PRICE_WEI = BigInt('1000000000000'); // 0.001 gwei in wei

let cachedGasPrice: { wei: bigint; gwei: string; timestamp: number } | null = null;
const GAS_PRICE_CACHE_TTL_MS = 30_000; // 30 seconds

async function fetchGasPrice(): Promise<{ wei: bigint; gwei: string }> {
  // Return cached if fresh
  if (cachedGasPrice && Date.now() - cachedGasPrice.timestamp < GAS_PRICE_CACHE_TTL_MS) {
    return { wei: cachedGasPrice.wei, gwei: cachedGasPrice.gwei };
  }

  try {
    const response = await fetch(ARC_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_gasPrice',
        params: [],
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) throw new Error(`RPC returned ${response.status}`);

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const weiHex = data.result as string;
    const wei = BigInt(weiHex);
    const gwei = (wei / BigInt('1000000000')).toString();

    cachedGasPrice = { wei, gwei, timestamp: Date.now() };
    return { wei, gwei };
  } catch {
    // Return fallback on error
    return { wei: FALLBACK_GAS_PRICE_WEI, gwei: FALLBACK_GAS_PRICE_GWEI };
  }
}

function formatUsdc(costWei: bigint): string {
  // Arc uses native token for gas; display cost in the native unit
  // 1 Arc native token = 1e18 wei (similar to ETH)
  const cost = Number(costWei) / 1e18;
  return `${cost.toFixed(6)} ARC`;
}

function clampBytecodeSize(size: number): number {
  return Math.max(0, Math.min(MAX_BYTECODE_SIZE, Math.round(size)));
}

export async function estimateDeployment(bytecodeSize: number): Promise<GasEstimate> {
  const gasPrice = await fetchGasPrice();
  const clamped = clampBytecodeSize(bytecodeSize);
  const dataGas = clamped * DEPLOY_GAS_PER_BYTE;
  const gasUnits = Math.max(MIN_GAS, BASE_DEPLOY_GAS + dataGas);
  const costWei = gasPrice.wei * BigInt(gasUnits);

  const breakdown: string[] = [
    `Base transaction: ${MIN_GAS.toLocaleString()} gas`,
  ];
  if (clamped > 0) {
    breakdown.push(`Bytecode data (${clamped} bytes × ${DEPLOY_GAS_PER_BYTE} gas/byte): ${dataGas.toLocaleString()} gas`);
  }
  breakdown.push(`Total: ${gasUnits.toLocaleString()} gas`);
  breakdown.push(`Gas price: ${gasPrice.gwei} gwei (live from Arc Testnet)`);

  return {
    gasUnits,
    gasPriceGwei: gasPrice.gwei,
    usdcCost: formatUsdc(costWei),
    breakdown,
    isLive: cachedGasPrice !== null,
  };
}

export async function estimateInteraction(functionSelector: string, hasLoop: boolean): Promise<GasEstimate> {
  const gasPrice = await fetchGasPrice();
  const baseGas = 21_000;
  const functionGas = 5_000;
  const loopGas = hasLoop ? 10_000 : 0;
  const gasUnits = Math.max(MIN_GAS, baseGas + functionGas + loopGas);
  const costWei = gasPrice.wei * BigInt(gasUnits);

  const breakdown: string[] = [
    `Base transaction: ${MIN_GAS.toLocaleString()} gas`,
    `Function execution: ${functionGas.toLocaleString()} gas`,
  ];
  if (hasLoop) {
    breakdown.push(`Loop operations (estimated): ${loopGas.toLocaleString()} gas`);
  }
  breakdown.push(`Total: ${gasUnits.toLocaleString()} gas`);
  breakdown.push(`Gas price: ${gasPrice.gwei} gwei (live from Arc Testnet)`);

  return {
    gasUnits,
    gasPriceGwei: gasPrice.gwei,
    usdcCost: formatUsdc(costWei),
    breakdown,
    isLive: cachedGasPrice !== null,
  };
}
