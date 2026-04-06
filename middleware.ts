import { NextRequest, NextResponse } from 'next/server';

type Counter = {
  count: number;
  resetAt: number;
};

const counters = new Map<string, Counter>();

const WINDOW_MS = 60_000;
const CLEANUP_INTERVAL_MS = 5 * 60_000;
const GLOBAL_API_LIMIT = 120;
const AUTH_LIMIT = 30;
const INTEGRATION_LIMIT = 40;
const LOW_UA_LIMIT = 20;

let lastCleanupAt = 0;

function maybeCleanup(now: number): void {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  for (const [key, value] of counters.entries()) {
    if (value.resetAt <= now) counters.delete(key);
  }
}

function resolveClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  return 'unknown';
}

function resolveLimit(pathname: string, userAgent: string): number {
  const isAuthRoute = pathname.startsWith('/api/auth/');
  const isIntegrationRoute = pathname.startsWith('/api/integrations/');
  const hasLowSignalUa = userAgent.trim().length < 6;

  if (isAuthRoute) return AUTH_LIMIT;
  if (isIntegrationRoute) return INTEGRATION_LIMIT;
  if (hasLowSignalUa) return LOW_UA_LIMIT;
  return GLOBAL_API_LIMIT;
}

export function middleware(request: NextRequest): NextResponse {
  const now = Date.now();
  maybeCleanup(now);

  const ip = resolveClientIp(request);
  const pathname = request.nextUrl.pathname;
  const userAgent = request.headers.get('user-agent') ?? '';
  const limit = resolveLimit(pathname, userAgent);
  const bucketKey = `${ip}:${pathname}`;

  const existing = counters.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    counters.set(bucketKey, { count: 1, resetAt: now + WINDOW_MS });

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(limit));
    response.headers.set('X-RateLimit-Remaining', String(limit - 1));
    response.headers.set('X-RateLimit-Reset', String(now + WINDOW_MS));
    return response;
  }

  if (existing.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(existing.resetAt),
        },
      }
    );
  }

  existing.count += 1;
  counters.set(bucketKey, existing);

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, limit - existing.count)));
  response.headers.set('X-RateLimit-Reset', String(existing.resetAt));
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
