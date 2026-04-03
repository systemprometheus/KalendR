import { NextResponse } from 'next/server';
import { users } from '@/lib/db';

export async function GET() {
  // Touch the DB layer so health checks fail when production storage is misconfigured.
  users().count();
  return NextResponse.json({ ok: true, status: 'healthy', storage: 'ready' });
}
