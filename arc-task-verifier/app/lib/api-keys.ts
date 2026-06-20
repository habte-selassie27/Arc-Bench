import { Redis } from '@upstash/redis';

const KEY_PREFIX = 'arc_';
const KEY_BYTES = 32;
const REDIS_KEY_PREFIX = 'api_key:';

export interface ApiKeyRecord {
  key: string;
  label: string;
  createdAt: number;
  requestCount: number;
}

const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// In-memory fallback for when Redis is unavailable
const memStore = new Map<string, ApiKeyRecord>();

// Seed demo key on module load
const DEMO_KEY = 'arc_demo_key';
async function seedDemoKey(): Promise<void> {
  const record: ApiKeyRecord = {
    key: DEMO_KEY,
    label: 'Demo',
    createdAt: Date.now(),
    requestCount: 0,
  };
  if (redis) {
    const existing = await redis.get(`${REDIS_KEY_PREFIX}${DEMO_KEY}`);
    if (!existing) {
      await redis.set(`${REDIS_KEY_PREFIX}${DEMO_KEY}`, record);
    }
  } else {
    if (!memStore.has(DEMO_KEY)) {
      memStore.set(DEMO_KEY, record);
    }
  }
}
seedDemoKey();

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function generateApiKey(label: string): Promise<string> {
  const raw = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const key = KEY_PREFIX + raw.slice(0, KEY_BYTES * 2);
  const record: ApiKeyRecord = {
    key,
    label,
    createdAt: Date.now(),
    requestCount: 0,
  };

  if (redis) {
    await redis.set(`${REDIS_KEY_PREFIX}${key}`, record);
  } else {
    memStore.set(key, record);
  }

  console.log(`[api-key] Created key "${key.slice(0, 8)}..." for label "${label}"`);
  return key;
}

export async function validateApiKey(key: string): Promise<ApiKeyRecord | null> {
  if (redis) {
    const record = (await redis.get(`${REDIS_KEY_PREFIX}${key}`)) as ApiKeyRecord | null;
    if (!record) return null;

    if (!timingSafeEqual(record.key, key)) return null;

    record.requestCount++;
    await redis.set(`${REDIS_KEY_PREFIX}${key}`, record);
    return record;
  }

  // In-memory fallback
  for (const [storedKey, record] of memStore.entries()) {
    if (timingSafeEqual(storedKey, key)) {
      record.requestCount++;
      return record;
    }
  }
  return null;
}

export async function getKeyMetadata(): Promise<Omit<ApiKeyRecord, 'key'>[]> {
  if (redis) {
    // Scan for all api_key:* keys
    const keys: string[] = [];
    let cursor = '0';
    do {
      const result = await redis.scan(cursor, { match: `${REDIS_KEY_PREFIX}*`, count: 100 });
      cursor = result[0] as string;
      keys.push(...result[1]);
    } while (cursor !== '0');

    const records: Omit<ApiKeyRecord, 'key'>[] = [];
    for (const redisKey of keys) {
      const record = (await redis.get(redisKey)) as ApiKeyRecord | null;
      if (record) {
        records.push({
          label: record.label,
          createdAt: record.createdAt,
          requestCount: record.requestCount,
        });
      }
    }
    return records;
  }

  // In-memory fallback
  const result: Omit<ApiKeyRecord, 'key'>[] = [];
  for (const record of memStore.values()) {
    result.push({
      label: record.label,
      createdAt: record.createdAt,
      requestCount: record.requestCount,
    });
  }
  return result;
}
