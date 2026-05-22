import { NextRequest, NextResponse } from 'next/server';
import { fetchContractInfo, isValidAddress, normalizeAddress, clearContractCache, getContractCacheSize } from '../../lib/arcscan';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Contract address is required' },
        { status: 400 }
      );
    }

    const normalized = normalizeAddress(address);

    if (!isValidAddress(normalized)) {
      return NextResponse.json(
        { error: 'Invalid address format. Must be a 42-character hex address starting with 0x' },
        { status: 400 }
      );
    }

    const result = await fetchContractInfo(normalized);

    return NextResponse.json({ ...result, address: normalized });
  } catch (error) {
    console.error('Contract verification error:', error);
    return NextResponse.json(
      { exists: false, isVerified: false, contractName: null, abi: null, error: 'Verification failed', address: '' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  clearContractCache();
  return NextResponse.json({ message: 'Contract cache cleared', size: getContractCacheSize() });
}
