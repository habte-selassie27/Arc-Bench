import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { validateApiKey } from './api-keys';
import type { ApiKeyRecord } from './api-keys';

const RATE_LIMIT_WINDOW_MS = 3_600_000; // 1 hour
const RATE_LIMIT_MAX = 100;
const REDIS_RL_PREFIX = 'rl:';

const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// In-memory fallback for rate limiting when Redis is unavailable
interface RateBucket {
  windowStart: number;
  count: number;
}
const rateBuckets = new Map<string, RateBucket>();

export interface AuthResult {
  valid: boolean;
  record?: ApiKeyRecord;
  error?: string;
  remaining?: number;
  resetAt?: number;
}

function getWindowStart(): number {
  return Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
}

async function redisCheckRateLimit(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const windowStart = getWindowStart();
  const resetAt = windowStart + RATE_LIMIT_WINDOW_MS;
  const bucketKey = `${REDIS_RL_PREFIX}${key}:${windowStart}`;

  const current = (await redis!.get(bucketKey)) as number | null;
  const count = current ?? 0;

  if (count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt };
  }

  await redis!.set(bucketKey, count + 1, { ex: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) });
  return { allowed: true, remaining: RATE_LIMIT_MAX - count - 1, resetAt };
}

function memCheckRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowStart = getWindowStart();
  const resetAt = windowStart + RATE_LIMIT_WINDOW_MS;
  const bucketKey = `${key}:${windowStart}`;

  let bucket = rateBuckets.get(bucketKey);
  if (!bucket) {
    bucket = { windowStart, count: 0 };
    rateBuckets.set(bucketKey, bucket);
  }

  // Clean stale buckets (keep last 2 windows)
  for (const bk of rateBuckets.keys()) {
    if (!bk.startsWith(`${key}:`)) continue;
    const [, ts] = bk.split(':');
    const bucketStart = parseInt(ts, 10);
    if (now - bucketStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateBuckets.delete(bk);
    }
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt };
  }

  bucket.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - bucket.count, resetAt };
}

export async function checkRateLimit(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (redis) {
    try {
      return await redisCheckRateLimit(key);
    } catch {
      // Fall through to in-memory
    }
  }
  return memCheckRateLimit(key);
}

export async function requireApiKey(request: Request): Promise<AuthResult & { response?: NextResponse }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: 'Missing or malformed Authorization header. Expected: Bearer {api_key}',
      response: NextResponse.json(
        { error: 'Missing or malformed Authorization header. Expected: Bearer {api_key}' },
        { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
      ),
    };
  }

  const key = authHeader.slice(7).trim();
  if (!key) {
    return {
      valid: false,
      error: 'Authorization header is empty',
      response: NextResponse.json(
        { error: 'Authorization header is empty' },
        { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
      ),
    };
  }

  const record = await validateApiKey(key);
  if (!record) {
    console.log(`[api-auth] Invalid key attempt: "${key.slice(0, 8)}..."`);
    return {
      valid: false,
      error: 'Invalid API key',
      response: NextResponse.json(
        { error: 'Invalid API key' },
        { status: 403 }
      ),
    };
  }

  const rateCheck = await checkRateLimit(key);
  if (!rateCheck.allowed) {
    const retryAfter = Math.ceil((rateCheck.resetAt - Date.now()) / 1000);
    return {
      valid: false,
      error: `Rate limit exceeded. Retry after ${retryAfter} seconds`,
      response: NextResponse.json(
        { error: `Rate limit exceeded. Retry after ${retryAfter} seconds` },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateCheck.resetAt),
          },
        }
      ),
    };
  }

  return {
    valid: true,
    record,
    remaining: rateCheck.remaining,
    resetAt: rateCheck.resetAt,
  };
}

export function buildRateLimitHeaders(remaining: number, resetAt: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(resetAt),
  };
}
