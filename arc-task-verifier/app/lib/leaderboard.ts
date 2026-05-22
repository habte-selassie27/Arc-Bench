import { Redis } from '@upstash/redis';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface LeaderboardEntry {
  repoUrl: string;
  repoName: string;
  arcScore: number;
  signalScore: number;
  total: number;
  timestamp: number;
}

const MAX_ENTRIES = 100;
const REDIS_KEY = 'leaderboard';

// Try Redis first, fall back to file
const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const DATA_DIR = process.env.VERCEL ? '/tmp' : process.cwd();
const DATA_FILE = join(DATA_DIR, 'leaderboard.json');

function loadStore(): LeaderboardEntry[] {
  try {
    if (existsSync(DATA_FILE)) {
      return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch {
    // corrupt or missing file -> empty store
  }
  return [];
}

function saveStore(entries: LeaderboardEntry[]): void {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(entries), 'utf-8');
  } catch {
    // silent — best-effort
  }
}

let store: LeaderboardEntry[] = loadStore();

function getRepoName(url: string): string {
  return url.replace(/^https:\/\/github\.com\//, '');
}

function dedupe(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const seen = new Map<string, LeaderboardEntry>();
  for (const e of entries) {
    const existing = seen.get(e.repoUrl);
    if (!existing || e.total > existing.total) {
      seen.set(e.repoUrl, e);
    }
  }
  return [...seen.values()];
}

export async function submitToLeaderboard(entry: LeaderboardEntry): Promise<void> {
  const enriched = {
    ...entry,
    repoName: entry.repoName || getRepoName(entry.repoUrl),
  };

  // Redis path (cross-instance)
  if (redis) {
    try {
      await redis.lpush(REDIS_KEY, enriched);
      const all = await redis.lrange(REDIS_KEY, 0, MAX_ENTRIES - 1) as LeaderboardEntry[];
      const deduped = dedupe(all).sort((a, b) => b.total - a.total).slice(0, MAX_ENTRIES);
      await redis.del(REDIS_KEY);
      if (deduped.length > 0) {
        await redis.rpush(REDIS_KEY, ...deduped);
      }
      return;
    } catch {
      // fall through to file
    }
  }

  // File path (same-instance fallback)
  store.push(enriched);
  store = dedupe(store)
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_ENTRIES);
  saveStore(store);
}

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  // Redis path (cross-instance)
  if (redis) {
    try {
      const all = await redis.lrange(REDIS_KEY, 0, MAX_ENTRIES - 1) as LeaderboardEntry[];
      return all.sort((a, b) => b.total - a.total).slice(0, limit);
    } catch {
      // fall through to file
    }
  }

  // File path
  const fresh = loadStore();
  return fresh
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
