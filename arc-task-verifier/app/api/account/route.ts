import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export interface UserProfile {
  id: string;
  githubLogin?: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  lastLoginAt: number;
  historyIds: string[];
}

const USER_PREFIX = 'user:';

export async function getOrCreateUser(githubLogin: string, displayName: string, avatarUrl?: string): Promise<UserProfile> {
  if (!redis) {
    return { id: 'local-' + githubLogin, githubLogin, displayName, avatarUrl, createdAt: Date.now(), lastLoginAt: Date.now(), historyIds: [] };
  }

  const existing = await redis.get(`${USER_PREFIX}${githubLogin}`) as UserProfile | null;
  if (existing) {
    existing.lastLoginAt = Date.now();
    await redis.set(`${USER_PREFIX}${githubLogin}`, existing);
    return existing;
  }

  const user: UserProfile = {
    id: crypto.randomUUID(),
    githubLogin,
    displayName,
    avatarUrl,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    historyIds: [],
  };
  await redis.set(`${USER_PREFIX}${githubLogin}`, user);
  return user;
}

export async function addHistoryToUser(githubLogin: string, historyId: string): Promise<void> {
  if (!redis) return;
  const user = await redis.get(`${USER_PREFIX}${githubLogin}`) as UserProfile | null;
  if (user) {
    user.historyIds = [historyId, ...user.historyIds].slice(0, 100);
    await redis.set(`${USER_PREFIX}${githubLogin}`, user);
  }
}

export async function getUser(githubLogin: string): Promise<UserProfile | null> {
  if (!redis) return null;
  return (await redis.get(`${USER_PREFIX}${githubLogin}`)) as UserProfile | null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, githubLogin, displayName, avatarUrl } = body;

    if (action === 'get' && githubLogin) {
      const user = await getUser(githubLogin);
      return NextResponse.json({ user });
    }

    if (action === 'create' && githubLogin && displayName) {
      const user = await getOrCreateUser(githubLogin, displayName, avatarUrl);
      return NextResponse.json({ user });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
