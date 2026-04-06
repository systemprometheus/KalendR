import { NextResponse } from 'next/server';
import { users } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';
import { normalizeEmail } from '@/lib/validation';

type LoginAttemptState = {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
};

const loginAttempts = new Map<string, LoginAttemptState>();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function getClientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const cfIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

function getAttemptKey(ip: string, email: string) {
  return `${ip}:${email}`;
}

function getAttemptState(key: string, now: number): LoginAttemptState {
  const current = loginAttempts.get(key);
  if (!current) {
    const created = { count: 0, firstAttemptAt: now };
    loginAttempts.set(key, created);
    return created;
  }

  if (now - current.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    const reset = { count: 0, firstAttemptAt: now };
    loginAttempts.set(key, reset);
    return reset;
  }

  return current;
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = normalizeEmail(email);
    const ip = getClientIp(req);
    const now = Date.now();

    if (!normalizedEmail || typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const key = getAttemptKey(ip, normalizedEmail);
    const attemptState = getAttemptState(key, now);
    if (attemptState.blockedUntil && attemptState.blockedUntil > now) {
      const retryAfter = Math.ceil((attemptState.blockedUntil - now) / 1000);
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const user = users().findFirst({ where: { email: normalizedEmail } });
    if (!user) {
      attemptState.count += 1;
      if (attemptState.count >= MAX_ATTEMPTS) {
        attemptState.blockedUntil = now + LOCKOUT_MS;
      }
      loginAttempts.set(key, attemptState);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      attemptState.count += 1;
      if (attemptState.count >= MAX_ATTEMPTS) {
        attemptState.blockedUntil = now + LOCKOUT_MS;
      }
      loginAttempts.set(key, attemptState);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    loginAttempts.delete(key);

    const token = await createSession(user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        slug: user.slug,
        timezone: user.timezone,
        onboardingComplete: user.onboardingComplete,
        orgRole: user.orgRole,
        organizationId: user.organizationId,
      },
    });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
