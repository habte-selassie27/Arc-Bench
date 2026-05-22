import { NextRequest, NextResponse } from 'next/server';
import { analyzeSolidity } from '../../lib/solidity-analyzer';

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_INPUT_BYTES = 50_000;

const rateLimitMap = new Map<string, number[]>();

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const withinWindow = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (withinWindow.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, withinWindow);
    return false;
  }

  withinWindow.push(now);
  rateLimitMap.set(ip, withinWindow);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getRateLimitKey(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 requests per minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Solidity source code is required' },
        { status: 400 }
      );
    }

    const sanitized = code.replace(/\0/g, '').slice(0, MAX_INPUT_BYTES);

    if (!/pragma\s+solidity/i.test(sanitized)) {
      return NextResponse.json(
        { error: 'Invalid Solidity source. Code must contain "pragma solidity".' },
        { status: 400 }
      );
    }

    const result = analyzeSolidity(sanitized);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Contract analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed. Please check the source code and try again.' },
      { status: 500 }
    );
  }
}
