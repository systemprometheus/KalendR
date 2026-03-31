import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { users, sessions } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production-min32chars';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: Record<string, any>, expiresIn: string = '30d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): Record<string, any> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, any>;
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

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) return null;

    const payload = verifyToken(sessionToken);
    if (!payload) return null;

    const session = sessions().findFirst({ where: { token: sessionToken } });
    if (!session || new Date(session.expiresAt) < new Date()) return null;

    const user = users().findById(session.userId);
    if (!user) return null;

    // Don't return password hash
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}
