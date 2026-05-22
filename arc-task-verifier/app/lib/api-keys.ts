const KEY_PREFIX = 'arc_';
const KEY_BYTES = 32;

export interface ApiKeyRecord {
  key: string;
  label: string;
  createdAt: number;
  requestCount: number;
}

// TODO: move to KV for persistence across deployments
const keys = new Map<string, ApiKeyRecord>();

// Seed demo key on module load
const DEMO_KEY = 'arc_demo_key';
if (!keys.has(DEMO_KEY)) {
  keys.set(DEMO_KEY, {
    key: DEMO_KEY,
    label: 'Demo',
    createdAt: Date.now(),
    requestCount: 0,
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function generateApiKey(label: string): string {
  const raw = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const key = KEY_PREFIX + raw.slice(0, KEY_BYTES * 2);
  const record: ApiKeyRecord = {
    key,
    label,
    createdAt: Date.now(),
    requestCount: 0,
  };
  keys.set(key, record);
  // Log only prefix for debugging
  console.log(`[api-key] Created key "${key.slice(0, 8)}..." for label "${label}"`);
  return key;
}

export function validateApiKey(key: string): ApiKeyRecord | null {
  for (const storedKey of keys.keys()) {
    if (timingSafeEqual(storedKey, key)) {
      const record = keys.get(storedKey)!;
      record.requestCount++;
      return record;
    }
  }
  return null;
}

export function getKeyMetadata(): Omit<ApiKeyRecord, 'key'>[] {
  const result: Omit<ApiKeyRecord, 'key'>[] = [];
  for (const record of keys.values()) {
    result.push({
      label: record.label,
      createdAt: record.createdAt,
      requestCount: record.requestCount,
    });
  }
  return result;
}
