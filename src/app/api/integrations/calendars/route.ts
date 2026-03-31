import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { connectedCalendars } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const calendars = connectedCalendars().findMany({ where: { userId: user.id } });

    // Mask tokens
    const safe = calendars.map((c: any) => ({
      id: c.id,
      provider: c.provider,
      email: c.email,
      checkForConflicts: c.checkForConflicts,
      addEventsTo: c.addEventsTo,
      isPrimary: c.isPrimary,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ calendars: safe });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Scaffolding for connect flow - in production this would handle OAuth
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { provider } = await req.json();

    if (!['google', 'microsoft'].includes(provider)) {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    // In production, this would redirect to OAuth flow
    // For now, return the OAuth URL that would be used
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json({
          error: 'Google Calendar integration not configured',
          message: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables',
          stubbed: true,
        }, { status: 501 });
      }

      const redirectUri = `${baseUrl}/api/integrations/calendars/google/callback`;
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline&prompt=consent`;

      return NextResponse.json({ url: oauthUrl });
    }

    if (provider === 'microsoft') {
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json({
          error: 'Microsoft Calendar integration not configured',
          message: 'Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in environment variables',
          stubbed: true,
        }, { status: 501 });
      }

      const redirectUri = `${baseUrl}/api/integrations/calendars/microsoft/callback`;
      const oauthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=Calendars.ReadWrite`;

      return NextResponse.json({ url: oauthUrl });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
