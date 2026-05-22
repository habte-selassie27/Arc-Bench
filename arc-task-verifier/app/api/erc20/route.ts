import { NextRequest, NextResponse } from 'next/server';
import { scanToken } from '../../lib/token-scanner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid contract address' }, { status: 400 });
    }

    const info = await scanToken(address);
    return NextResponse.json(info);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
