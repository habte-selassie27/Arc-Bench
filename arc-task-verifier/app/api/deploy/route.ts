import { NextRequest, NextResponse } from 'next/server';
import { createDeployment, getDeployment } from '../../lib/deploy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { solSource, contractName, constructorArgs, walletAddress } = body;

    if (!solSource || !contractName) {
      return NextResponse.json({ error: 'solSource and contractName required' }, { status: 400 });
    }
    if (!walletAddress) {
      return NextResponse.json({ error: 'Connect wallet first' }, { status: 400 });
    }

    const deployStatus = await createDeployment({ solSource, contractName, constructorArgs, walletAddress });
    return NextResponse.json(deployStatus);
  } catch (error) {
    return NextResponse.json({ error: `Deploy failed: ${(error as Error).message}` }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  const status = await getDeployment(id);
  if (!status) {
    return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
  }
  return NextResponse.json(status);
}
