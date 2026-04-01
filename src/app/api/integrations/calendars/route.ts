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

// Connect flow - generates OAuth URLs for calendar providers
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { provider } = await req.json();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io';

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
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email',
        access_type: 'offline',
        prompt: 'consent',
      });

      return NextResponse.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
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

      const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
      const redirectUri = `${baseUrl}/api/integrations/calendars/microsoft/callback`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'Calendars.ReadWrite User.Read openid email profile',
        response_mode: 'query',
      });

      return NextResponse.json({
        url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`,
      });
    }

    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
