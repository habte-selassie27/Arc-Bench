import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, submitToLeaderboard } from '../../lib/leaderboard';
import type { LeaderboardEntry } from '../../lib/leaderboard';

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

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

const REPO_URL_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/;

export async function GET() {
  try {
    const entries = await getLeaderboard(20);
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getRateLimitKey(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 submissions per minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { repoUrl, arcScore, signalScore, total } = body;

    if (!repoUrl || typeof repoUrl !== 'string' || !REPO_URL_RE.test(repoUrl)) {
      return NextResponse.json(
        { error: 'Invalid repoUrl. Must be a valid https://github.com/owner/repo URL.' },
        { status: 400 }
      );
    }

    if (typeof arcScore !== 'number' || arcScore < 0 || arcScore > 100) {
      return NextResponse.json(
        { error: 'arcScore must be a number between 0 and 100.' },
        { status: 400 }
      );
    }

    if (typeof signalScore !== 'number' || signalScore < 0 || signalScore > 100) {
      return NextResponse.json(
        { error: 'signalScore must be a number between 0 and 100.' },
        { status: 400 }
      );
    }

    if (typeof total !== 'number' || total < 0 || total > 100) {
      return NextResponse.json(
        { error: 'total must be a number between 0 and 100.' },
        { status: 400 }
      );
    }

    const entry: LeaderboardEntry = {
      repoUrl,
      repoName: repoUrl.replace(/^https:\/\/github\.com\//, ''),
      arcScore,
      signalScore,
      total,
      timestamp: Date.now(),
    };

    await submitToLeaderboard(entry);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leaderboard submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit to leaderboard.' },
      { status: 500 }
    );
  }
}
