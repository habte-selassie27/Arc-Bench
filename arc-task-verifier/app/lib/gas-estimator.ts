export interface GasEstimate {
  gasUnits: number;
  usdcCost: string;
  breakdown: string[];
}

export const MIN_GAS = 21_000;
export const MAX_BYTECODE_SIZE = 24_576;
export const DEPLOY_GAS_PER_BYTE = 200;
export const BASE_DEPLOY_GAS = 21_000;

// TODO: Fetch live USDC gas price from Arc Testnet RPC (e.g., eth_gasPrice then convert to USDC)
// Current placeholder: 0.000001 USDC per gas unit
export const ARC_GAS_PRICE = 0.000_001;

function clampBytecodeSize(size: number): number {
  return Math.max(0, Math.min(MAX_BYTECODE_SIZE, Math.round(size)));
}

function formatUsdc(cost: number): string {
  return `${cost.toFixed(6)} USDC`;
}

export function estimateDeployment(bytecodeSize: number): GasEstimate {
  const clamped = clampBytecodeSize(bytecodeSize);
  const dataGas = clamped * DEPLOY_GAS_PER_BYTE;
  const gasUnits = Math.max(MIN_GAS, BASE_DEPLOY_GAS + dataGas);
  const usdcCost = gasUnits * ARC_GAS_PRICE;
  const breakdown: string[] = [
    `Base transaction: ${MIN_GAS.toLocaleString()} gas`,
  ];
  if (clamped > 0) {
    breakdown.push(`Bytecode data (${clamped} bytes × ${DEPLOY_GAS_PER_BYTE} gas/byte): ${dataGas.toLocaleString()} gas`);
  }
  breakdown.push(`Total: ${gasUnits.toLocaleString()} gas`);
  breakdown.push(`USDC price: ${ARC_GAS_PRICE} USDC/gas (placeholder rate)`);

  return { gasUnits, usdcCost: formatUsdc(usdcCost), breakdown };
}

export function estimateInteraction(functionSelector: string, hasLoop: boolean): GasEstimate {
  const baseGas = 21_000;
  const functionGas = 5_000;
  const loopGas = hasLoop ? 10_000 : 0;
  const gasUnits = Math.max(MIN_GAS, baseGas + functionGas + loopGas);
  const usdcCost = gasUnits * ARC_GAS_PRICE;
  const breakdown: string[] = [
    `Base transaction: ${MIN_GAS.toLocaleString()} gas`,
    `Function execution: ${functionGas.toLocaleString()} gas`,
  ];
  if (hasLoop) {
    breakdown.push(`Loop operations (estimated): ${loopGas.toLocaleString()} gas`);
  }
  breakdown.push(`Total: ${gasUnits.toLocaleString()} gas`);
  breakdown.push(`USDC price: ${ARC_GAS_PRICE} USDC/gas (placeholder rate)`);

  return { gasUnits, usdcCost: formatUsdc(usdcCost), breakdown };
}
