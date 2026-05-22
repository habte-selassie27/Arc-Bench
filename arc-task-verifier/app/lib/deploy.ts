import { Redis } from '@upstash/redis';

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
  error?: string;
  timestamp: number;
}

const ARC_TESTNET_RPC = 'https://rpc.testnet.arc.network';
const ARC_CHAIN_ID = 5042002;

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
arc_testnet = "${ARC_TESTNET_RPC}"

[etherscan]
arc_testnet = { url = "https://testnet.arcscan.app" }

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

  // Simulate deployment flow
  const simulate = async () => {
    await updateDeployment(id, { status: 'compiling' });
    await new Promise(r => setTimeout(r, 2000));

    await updateDeployment(id, { status: 'deploying' });
    await new Promise(r => setTimeout(r, 3000));

    // Generate deterministic fake address for demo
    const fakeHash = '0x' + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)).join('');
    const fakeAddress = '0x' + Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)).join('');

    await updateDeployment(id, {
      status: 'confirmed',
      txHash: fakeHash,
      contractAddress: fakeAddress,
    });
  };

  simulate().catch(async (err) => {
    await updateDeployment(id, { status: 'failed', error: err.message });
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

async function updateDeployment(id: string, updates: Partial<DeployStatus>): Promise<void> {
  if (redis) {
    const current = await redis.get(`deploy:${id}`) as DeployStatus | null;
    if (current) {
      await redis.set(`deploy:${id}`, { ...current, ...updates });
    }
  }
}
