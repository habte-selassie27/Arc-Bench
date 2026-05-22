import { NextRequest, NextResponse } from 'next/server';
import { estimateDeployment, estimateInteraction, MAX_BYTECODE_SIZE, GasEstimate } from '../../lib/gas-estimator';

interface CacheEntry {
  result: GasEstimate;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 300_000;

function getCacheKey(params: { bytecodeSize?: number; functionSig?: string; hasLoop?: boolean }): string {
  return JSON.stringify(params);
}

function getCached(key: string): GasEstimate | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

function setCached(key: string, result: GasEstimate): void {
  if (cache.size >= 100) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { result, timestamp: Date.now() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bytecodeSize, functionSig, hasLoop } = body;

    const cacheKey = getCacheKey({ bytecodeSize, functionSig, hasLoop });
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    let result: GasEstimate;

    if (bytecodeSize !== undefined && typeof bytecodeSize === 'number') {
      if (bytecodeSize < 0 || bytecodeSize > MAX_BYTECODE_SIZE) {
        return NextResponse.json(
          { error: `bytecodeSize must be between 0 and ${MAX_BYTECODE_SIZE}` },
          { status: 400 }
        );
      }
      result = estimateDeployment(bytecodeSize);
    } else if (functionSig !== undefined || hasLoop !== undefined) {
      result = estimateInteraction(functionSig ?? '0x', hasLoop ?? false);
    } else {
      // Default: estimate a small deployment (500 bytes)
      result = estimateDeployment(500);
    }

    setCached(cacheKey, result);

    return NextResponse.json({ ...result, cached: false });
  } catch (error) {
    console.error('Gas estimate error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate gas estimate' },
      { status: 500 }
    );
  }
}
