import { NextResponse } from 'next/server';
import { users } from '@/lib/db';

export async function GET() {
  const start = Date.now();

  // Touch the DB layer so health checks fail when production storage is misconfigured.
  const userCount = users().count();
  const dbLatencyMs = Date.now() - start;

  return NextResponse.json({
    ok: true,
    status: 'healthy',
    storage: 'ready',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    checks: {
      database: {
        status: 'ok',
        latencyMs: dbLatencyMs,
        userCount,
      },
    },
  });
}
