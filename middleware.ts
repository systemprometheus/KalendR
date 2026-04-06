import { NextRequest, NextResponse } from 'next/server';

type Counter = {
  count: number;
  resetAt: number;
};

const counters = new Map<string, Counter>();

const WINDOW_MS = 60_000;
const CLEANUP_INTERVAL_MS = 5 * 60_000;
const GLOBAL_IP_LIMIT = 150;
const GLOBAL_API_LIMIT = 80;
const GLOBAL_WEB_LIMIT = 50;
const AUTH_LIMIT = 20;
const INTEGRATION_LIMIT = 30;
const LOW_UA_LIMIT = 10;
const DISALLOWED_UA_PATTERNS = [
  /req\/v\d+/i,
  /cms-checker/i,
  /python-requests/i,
  /wget/i,
];
const DEFAULT_BLOCKED_IPS = new Set([
  '51.120.80.210',
  '190.153.94.31',
  '34.69.7.113',
  '115.132.195.220',
]);
const ENV_BLOCKED_IPS = new Set(
  (process.env.BLOCKED_IPS ?? '')
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0)
);

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
  const isApiRoute = pathname.startsWith('/api/');
  const isAuthRoute = pathname.startsWith('/api/auth/');
  const isIntegrationRoute = pathname.startsWith('/api/integrations/');
  const hasLowSignalUa = userAgent.trim().length < 6;

  if (hasLowSignalUa) return LOW_UA_LIMIT;
  if (isAuthRoute) return AUTH_LIMIT;
  if (isIntegrationRoute) return INTEGRATION_LIMIT;
  if (isApiRoute) return GLOBAL_API_LIMIT;
  return GLOBAL_WEB_LIMIT;
}

function consumeBucket(key: string, limit: number, now: number) {
  const existing = counters.get(key);

  if (!existing || existing.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return {
      exceeded: false,
      resetAt: now + WINDOW_MS,
      remaining: Math.max(0, limit - 1),
    };
  }

  if (existing.count >= limit) {
    return {
      exceeded: true,
      resetAt: existing.resetAt,
      remaining: 0,
    };
  }

  existing.count += 1;
  counters.set(key, existing);

  return {
    exceeded: false,
    resetAt: existing.resetAt,
    remaining: Math.max(0, limit - existing.count),
  };
}

function limitResponse(
  isApiRoute: boolean,
  limit: number,
  resetAt: number,
  now: number
): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));

  if (isApiRoute) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetAt),
        },
      }
    );
  }

  return new NextResponse('Too many requests. Please try again shortly.', {
    status: 429,
    headers: {
      'Retry-After': String(retryAfter),
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(resetAt),
    },
  });
}

function attachHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetAt: number
): void {
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(resetAt));
}

function attachGlobalHeaders(
  response: NextResponse,
  remaining: number,
  resetAt: number
): void {
  response.headers.set('X-GlobalRateLimit-Limit', String(GLOBAL_IP_LIMIT));
  response.headers.set('X-GlobalRateLimit-Remaining', String(remaining));
  response.headers.set('X-GlobalRateLimit-Reset', String(resetAt));
}

export function middleware(request: NextRequest): NextResponse {
  const now = Date.now();
  maybeCleanup(now);

  const ip = resolveClientIp(request);
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api/');
  const userAgent = request.headers.get('user-agent') ?? '';
  const normalizedUa = userAgent.trim();
  const routeLimit = resolveLimit(pathname, userAgent);

  if (DEFAULT_BLOCKED_IPS.has(ip) || ENV_BLOCKED_IPS.has(ip)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  if (!normalizedUa) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  if (DISALLOWED_UA_PATTERNS.some((pattern) => pattern.test(normalizedUa))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const globalBucket = consumeBucket(`global:${ip}`, GLOBAL_IP_LIMIT, now);
  if (globalBucket.exceeded) {
    return limitResponse(isApiRoute, GLOBAL_IP_LIMIT, globalBucket.resetAt, now);
  }

  const pathBucket = consumeBucket(`path:${ip}:${pathname}`, routeLimit, now);
  if (pathBucket.exceeded) {
    return limitResponse(isApiRoute, routeLimit, pathBucket.resetAt, now);
  }

  const response = NextResponse.next();
  attachHeaders(response, routeLimit, pathBucket.remaining, pathBucket.resetAt);
  attachGlobalHeaders(response, globalBucket.remaining, globalBucket.resetAt);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)',
  ],
};
