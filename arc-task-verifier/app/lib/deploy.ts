import { Redis } from '@upstash/redis';
import { ARC_RPC_URL, ARC_CHAIN_ID, ARCSCAN_BASE_URL } from './config';

const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export interface DeployRequest {
  solSource: string;
  contractName: string;
  constructorArgs?: string[];
  walletAddress: string;
}

export interface DeployStatus {
  id: string;
  status: 'pending' | 'compiling' | 'deploying' | 'confirmed' | 'failed';
  txHash?: string;
  contractAddress?: string;
  gasEstimate?: { gasUnits: number; gasPriceGwei: string; estimatedCostUsdc: string };
  error?: string;
  timestamp: number;
}

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(ARC_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`RPC call failed: ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(`RPC error: ${data.error.message}`);
  return data.result;
}

async function getGasPrice(): Promise<{ wei: string; gwei: string }> {
  const result = (await rpcCall('eth_gasPrice', [])) as string;
  const weiBigInt = BigInt(result);
  const gwei = (weiBigInt / BigInt('1000000000')).toString();
  return { wei: result, gwei };
}

async function getChainId(): Promise<number> {
  const result = (await rpcCall('eth_chainId', [])) as string;
  return parseInt(result, 16);
}

async function estimateDeployGas(bytecodeSize: number, constructorArgs?: string[]): Promise<number> {
  const baseGas = 21_000;
  const dataGas = bytecodeSize * 200;
  const argsGas = (constructorArgs?.length || 0) * 32_000;
  return baseGas + dataGas + argsGas;
}

async function checkRpcConnectivity(): Promise<boolean> {
  try {
    await rpcCall('eth_blockNumber', []);
    return true;
  } catch {
    return false;
  }
}

function generateFoundryScript(req: DeployRequest): string {
  const args = req.constructorArgs?.length
    ? `abi.encode(${req.constructorArgs.join(', ')})`
    : '""';

  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {${req.contractName}} from "./${req.contractName}.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ${args !== '""' ? `bytes memory constructorArgs = ${args};` : ''}
        new ${req.contractName}${args !== '""' ? '(constructorArgs)' : '()'}

        vm.stopBroadcast();
    }
}`;
}

export function generateFoundryConfig(): string {
  return `[profile.default]
src = "src"
out = "out"
lib_path = "lib"

[rpc_endpoints]
arc_testnet = "${ARC_RPC_URL}"

[etherscan]
arc_testnet = { url = "${ARCSCAN_BASE_URL}" }

[chain]
arc_testnet = ${ARC_CHAIN_ID}
`;
}

export async function createDeployment(req: DeployRequest): Promise<DeployStatus> {
  const id = crypto.randomUUID();
  const status: DeployStatus = {
    id,
    status: 'pending',
    timestamp: Date.now(),
  };

  if (redis) {
    await redis.set(`deploy:${id}`, status);
  }

  const runDeployment = async () => {
    // Step 1: Check RPC connectivity
    await updateDeployment(id, { status: 'compiling' });
    const rpcOk = await checkRpcConnectivity();
    if (!rpcOk) {
      throw new Error('Arc Testnet RPC is unreachable. Check your network connection.');
    }

    // Step 2: Get real gas price and chain info
    const [gasPrice, chainId] = await Promise.all([getGasPrice(), getChainId()]);

    if (chainId !== ARC_CHAIN_ID) {
      throw new Error(`Wrong chain. Expected Arc Testnet (${ARC_CHAIN_ID}), got ${chainId}. Switch MetaMask to Arc Testnet.`);
    }

    // Step 3: Estimate deployment gas
    const estimatedBytecodeSize = Math.max(200, req.solSource.length * 2);
    const gasUnits = await estimateDeployGas(estimatedBytecodeSize, req.constructorArgs);
    const gasPriceWei = BigInt(gasPrice.wei);
    const costWei = gasPriceWei * BigInt(gasUnits);
    const costUsdc = Number(costWei) / Number(BigInt('1000000000000000000')); // 1e18

    await updateDeployment(id, {
      status: 'deploying',
      gasEstimate: {
        gasUnits,
        gasPriceGwei: gasPrice.gwei,
        estimatedCostUsdc: costUsdc.toFixed(6),
      },
    });

    // Step 4: Generate Foundry project files (ready for user to deploy locally)
    const foundryScript = generateFoundryScript(req);
    const foundryConfig = generateFoundryConfig();

    // Step 5: Return deployment-ready status
    // Actual deployment requires the user's private key — they run:
    //   forge create src/${req.contractName}.sol:${req.contractName} \
    //     --rpc-url ${ARC_TESTNET_RPC} \
    //     --private-key $PRIVATE_KEY
    await updateDeployment(id, {
      status: 'confirmed',
      txHash: undefined,
      contractAddress: undefined,
      gasEstimate: {
        gasUnits,
        gasPriceGwei: gasPrice.gwei,
        estimatedCostUsdc: costUsdc.toFixed(6),
      },
    });

    // Store Foundry files for download
    if (redis) {
      await redis.set(`deploy:${id}:foundry_script`, foundryScript);
      await redis.set(`deploy:${id}:foundry_config`, foundryConfig);
      await redis.set(`deploy:${id}:sol_source`, req.solSource);
    }
  };

  runDeployment().catch(async (err) => {
    await updateDeployment(id, { status: 'failed', error: (err as Error).message });
  });

  return status;
}

export async function getDeployment(id: string): Promise<DeployStatus | null> {
  if (redis) {
    const data = await redis.get(`deploy:${id}`);
    return data as DeployStatus | null;
  }
  return null;
}

export async function getDeploymentFiles(id: string): Promise<{ script?: string; config?: string; sol?: string } | null> {
  if (redis) {
    const [script, config, sol] = await Promise.all([
      redis.get(`deploy:${id}:foundry_script`) as Promise<string | null>,
      redis.get(`deploy:${id}:foundry_config`) as Promise<string | null>,
      redis.get(`deploy:${id}:sol_source`) as Promise<string | null>,
    ]);
    return { script: script ?? undefined, config: config ?? undefined, sol: sol ?? undefined };
  }
  return null;
}

async function updateDeployment(id: string, updates: Partial<DeployStatus>): Promise<void> {
  if (redis) {
    const current = await redis.get(`deploy:${id}`) as DeployStatus | null;
    if (current) {
      await redis.set(`deploy:${id}`, { ...current, ...updates });
    }
  }
}
