import { NextRequest, NextResponse } from 'next/server';
import { handleGoogleCalendarWatchNotification } from '@/lib/google-calendar';

export async function POST(req: NextRequest) {
  try {
    await handleGoogleCalendarWatchNotification(req.headers);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Google Calendar watch webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
