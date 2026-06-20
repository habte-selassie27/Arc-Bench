import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

if (!redis && process.env.VERCEL) {
  console.warn('[account] Redis not configured — user profiles will not persist across deployments on Vercel.');
}

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
const DATA_DIR = process.env.VERCEL ? '/tmp' : process.cwd();
const USERS_FILE = join(DATA_DIR, 'users.json');

function ensureDataDir(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

function loadUsers(): Record<string, UserProfile> {
  try {
    if (existsSync(USERS_FILE)) {
      return JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveUsers(users: Record<string, UserProfile>): void {
  try {
    ensureDataDir();
    writeFileSync(USERS_FILE, JSON.stringify(users), 'utf-8');
  } catch {}
}

const memUsers: Record<string, UserProfile> = loadUsers();

export async function getOrCreateUser(githubLogin: string, displayName: string, avatarUrl?: string): Promise<UserProfile> {
  if (redis) {
    const existing = (await redis.get(`${USER_PREFIX}${githubLogin}`)) as UserProfile | null;
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

  // File-based fallback
  if (memUsers[githubLogin]) {
    memUsers[githubLogin].lastLoginAt = Date.now();
    saveUsers(memUsers);
    return memUsers[githubLogin];
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
  memUsers[githubLogin] = user;
  saveUsers(memUsers);
  return user;
}

export async function addHistoryToUser(githubLogin: string, historyId: string): Promise<void> {
  if (redis) {
    const user = (await redis.get(`${USER_PREFIX}${githubLogin}`)) as UserProfile | null;
    if (user) {
      user.historyIds = [historyId, ...user.historyIds].slice(0, 100);
      await redis.set(`${USER_PREFIX}${githubLogin}`, user);
    }
    return;
  }

  if (memUsers[githubLogin]) {
    memUsers[githubLogin].historyIds = [historyId, ...memUsers[githubLogin].historyIds].slice(0, 100);
    saveUsers(memUsers);
  }
}

export async function getUser(githubLogin: string): Promise<UserProfile | null> {
  if (redis) {
    return (await redis.get(`${USER_PREFIX}${githubLogin}`)) as UserProfile | null;
  }
  return memUsers[githubLogin] || null;
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
