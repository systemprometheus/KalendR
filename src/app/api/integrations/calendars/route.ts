import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { connectedCalendars } from '@/lib/db';
import { buildGoogleCalendarOAuthUrl, updateGoogleCalendarSettings } from '@/lib/google-calendar';

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
      accountEmail: c.accountEmail || c.email,
      accountExternalId: c.accountExternalId || '',
      calendarId: c.calendarId || '',
      calendarName: c.calendarName || '',
      accessRole: c.accessRole || '',
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

      return NextResponse.json({ url: buildGoogleCalendarOAuthUrl(baseUrl, clientId) });
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

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, checkForConflicts, addEventsTo } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Calendar id is required' }, { status: 400 });
    }

    const calendar = connectedCalendars().findFirst({ where: { id, userId: user.id } });
    if (!calendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    if (calendar.provider !== 'google') {
      return NextResponse.json({ error: 'Calendar settings are currently supported for Google only' }, { status: 400 });
    }

    const updated = await updateGoogleCalendarSettings({
      userId: user.id,
      calendarId: id,
      checkForConflicts,
      addEventsTo,
    });

    return NextResponse.json({
      calendar: updated ? {
        id: updated.id,
        provider: updated.provider,
        email: updated.email,
        accountEmail: (updated as any).accountEmail || updated.email,
        accountExternalId: (updated as any).accountExternalId || '',
        calendarId: (updated as any).calendarId || '',
        calendarName: (updated as any).calendarName || '',
        accessRole: (updated as any).accessRole || '',
        checkForConflicts: updated.checkForConflicts,
        addEventsTo: updated.addEventsTo,
        isPrimary: updated.isPrimary,
        createdAt: updated.createdAt,
      } : null,
    });
  } catch (error: any) {
    const message = error?.message || 'Internal server error';
    const status = message === 'This calendar is read-only and cannot receive new bookings.' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
