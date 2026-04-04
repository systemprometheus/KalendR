import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies, headers } from 'next/headers';
import { createHash, randomBytes } from 'crypto';
import { users, sessions, agentTokens } from './db';

const DEV_JWT_SECRET = 'dev-secret-key-change-in-production-min32chars';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
export const DEFAULT_AGENT_TOKEN_SCOPES = [
  'profile:read',
  'bookings:read',
  'bookings:write',
  'event-types:read',
  'event-types:write',
  'calendars:read',
  'calendars:write',
  'tokens:read',
  'tokens:write',
] as const;

export const ALLOWED_AGENT_TOKEN_SCOPES = [...DEFAULT_AGENT_TOKEN_SCOPES] as const;

type SafeUser = Record<string, any>;
type AuthContext = {
  user: SafeUser;
  authType: 'session' | 'agent_token';
  scopes: string[];
  agentTokenId?: string;
};

export function getJwtSecret(): string {
  const configured = (process.env.JWT_SECRET || '').trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production');
  }

  return DEV_JWT_SECRET;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash || typeof hash !== 'string' || hash.length < 20) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: Record<string, any>, expiresIn: string = '30d'): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): Record<string, any> | null {
  try {
    return jwt.verify(token, getJwtSecret()) as Record<string, any>;
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken({ userId, type: 'session' });
  const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();

  sessions().create({
    userId,
    token,
    expiresAt,
  });

  return token;
}

function sanitizeUser(user: Record<string, any>) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function hashAgentToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function buildAgentTokenPreview(token: string): string {
  return `${token.slice(0, 10)}...${token.slice(-6)}`;
}

function getAuthHeaderBearerToken(value?: string | null): string | null {
  if (!value) return null;
  const [scheme, token] = value.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

async function getCurrentUserFromAgentToken(rawToken: string) {
  const tokenHash = hashAgentToken(rawToken);
  const record = agentTokens().findFirst({ where: { tokenHash } });
  if (!record || record.revokedAt) return null;
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) return null;

  const user = users().findById(record.userId);
  if (!user) return null;

  agentTokens().update(record.id, {
    lastUsedAt: new Date().toISOString(),
  });

  return {
    user: sanitizeUser(user),
    authType: 'agent_token' as const,
    scopes: normalizeScopes(record.scopes),
    agentTokenId: record.id,
  };
}

async function getCurrentUserFromSession(sessionToken: string) {
  const payload = verifyToken(sessionToken);
  if (!payload) return null;

  const session = sessions().findFirst({ where: { token: sessionToken } });
  if (!session || new Date(session.expiresAt) < new Date()) return null;

  const user = users().findById(session.userId);
  if (!user) return null;

  return {
    user: sanitizeUser(user),
    authType: 'session' as const,
    scopes: ['*'],
  };
}

function normalizeScopes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item: unknown): item is string => typeof item === 'string');
}

export function normalizeAgentTokenScopes(value: unknown): string[] {
  const allowed = new Set<string>(ALLOWED_AGENT_TOKEN_SCOPES);
  return [...new Set(normalizeScopes(value).filter((scope) => allowed.has(scope)))];
}

export function validateAgentTokenScopes(requestedScopes: unknown, actor?: Pick<AuthContext, 'authType' | 'scopes'>) {
  const scopes = normalizeAgentTokenScopes(requestedScopes);

  if (!scopes.length) {
    return {
      scopes: [...DEFAULT_AGENT_TOKEN_SCOPES],
      invalidScopes: [] as string[],
      escalatedScopes: [] as string[],
    };
  }

  const requested = normalizeScopes(requestedScopes);
  const invalidScopes = requested.filter((scope) => !scopes.includes(scope));
  const escalatedScopes = actor?.authType === 'agent_token'
    ? scopes.filter((scope) => !hasScope(actor.scopes, scope))
    : [];

  return {
    scopes,
    invalidScopes,
    escalatedScopes,
  };
}

function hasScope(grantedScopes: string[], requiredScope: string) {
  if (grantedScopes.includes('*')) return true;
  if (grantedScopes.includes(requiredScope)) return true;

  const [namespace, action] = requiredScope.split(':', 2);
  if (namespace && grantedScopes.includes(`${namespace}:*`)) return true;
  if (action === 'read' && grantedScopes.includes('read')) return true;
  if (action === 'write' && grantedScopes.includes('write')) return true;

  return false;
}

export async function getCurrentAuthContext(): Promise<AuthContext | null> {
  try {
    const headerStore = await headers();
    const bearerToken = getAuthHeaderBearerToken(headerStore.get('authorization'));
    if (bearerToken) {
      const tokenUser = await getCurrentUserFromAgentToken(bearerToken);
      if (tokenUser) return tokenUser;
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) return null;
    return getCurrentUserFromSession(sessionToken);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const context = await getCurrentAuthContext();
  return context?.user ?? null;
}

export async function requireAuth() {
  const context = await getCurrentAuthContext();
  if (!context) {
    throw new Error('Unauthorized');
  }
  return context.user;
}

export async function requireAuthWithScopes(requiredScopes: string[]) {
  const context = await getCurrentAuthContext();
  if (!context) {
    throw new Error('Unauthorized');
  }

  const missing = requiredScopes.filter((scope) => !hasScope(context.scopes, scope));
  if (missing.length > 0) {
    throw new Error(`Forbidden: missing scopes ${missing.join(', ')}`);
  }

  return context;
}

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
}

export function createOAuthState(intent: 'login' | 'signup' = 'login') {
  const nonce = randomBytes(24).toString('hex');
  return `${intent}:${nonce}`;
}

export function parseOAuthState(state: string | null | undefined): 'login' | 'signup' | null {
  if (!state) return null;
  const [intent, nonce] = state.split(':', 2);
  if (!nonce || (intent !== 'login' && intent !== 'signup')) {
    return null;
  }
  return intent;
}

export async function createAgentAccessToken(
  userId: string,
  options?: {
    name?: string;
    expiresInDays?: number;
    scopes?: string[];
  },
) {
  const rawToken = `kal_${randomBytes(24).toString('hex')}`;
  const expiresInDays = options?.expiresInDays ?? 90;
  const expiresAt = expiresInDays > 0
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  const record = agentTokens().create({
    userId,
    name: options?.name?.trim() || 'Kalendrio MCP',
    tokenHash: hashAgentToken(rawToken),
    tokenPreview: buildAgentTokenPreview(rawToken),
    scopes: options?.scopes?.length ? options.scopes : [...DEFAULT_AGENT_TOKEN_SCOPES],
    expiresAt,
    lastUsedAt: '',
    revokedAt: '',
  });

  return {
    token: rawToken,
    agentToken: record,
  };
}
