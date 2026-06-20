import { Redis } from '@upstash/redis';

const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const RL_PREFIX = 'rl:';
const RL_WINDOW_MS = 60_000; // 1 minute
const memBuckets = new Map<string, { count: number; windowStart: number }>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'anonymous';
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = RL_WINDOW_MS
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const resetAt = windowStart + windowMs;

  if (redis) {
    try {
      const bucketKey = `${RL_PREFIX}${key}:${windowStart}`;
      const current = (await redis.get(bucketKey)) as number | null;
      const count = current ?? 0;

      if (count >= maxRequests) {
        return { allowed: false, remaining: 0, resetAt };
      }

      await redis.set(bucketKey, count + 1, { ex: Math.ceil(windowMs / 1000) });
      return { allowed: true, remaining: maxRequests - count - 1, resetAt };
    } catch {
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  const bucketKey = `${key}:${windowStart}`;
  const bucket = memBuckets.get(bucketKey) || { count: 0, windowStart };

  // Clean old windows
  for (const [bk, b] of memBuckets) {
    if (b.windowStart < windowStart) memBuckets.delete(bk);
  }

  if (bucket.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt };
  }

  bucket.count++;
  memBuckets.set(bucketKey, bucket);
  return { allowed: true, remaining: maxRequests - bucket.count, resetAt };
}
