import { NextRequest, NextResponse } from 'next/server';
import { estimateDeployment, estimateInteraction, MAX_BYTECODE_SIZE, GasEstimate } from '../../lib/gas-estimator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bytecodeSize, functionSig, hasLoop } = body;

    let result: GasEstimate;

    if (bytecodeSize !== undefined && typeof bytecodeSize === 'number') {
      if (bytecodeSize < 0 || bytecodeSize > MAX_BYTECODE_SIZE) {
        return NextResponse.json(
          { error: `bytecodeSize must be between 0 and ${MAX_BYTECODE_SIZE}` },
          { status: 400 }
        );
      }
      result = await estimateDeployment(bytecodeSize);
    } else if (functionSig !== undefined || hasLoop !== undefined) {
      result = await estimateInteraction(functionSig ?? '0x', hasLoop ?? false);
    } else {
      // Default: estimate a small deployment (500 bytes)
      result = await estimateDeployment(500);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Gas estimate error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate gas estimate' },
      { status: 500 }
    );
  }
}
