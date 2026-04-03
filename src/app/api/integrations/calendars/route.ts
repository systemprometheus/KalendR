import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithScopes } from '@/lib/auth';
import { connectedCalendars } from '@/lib/db';
import {
  buildGoogleCalendarOAuthUrl,
  ensureGoogleCalendarWatches,
  recoverGoogleCalendarConnection,
} from '@/lib/google-calendar';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthWithScopes(['calendars:read']);

    await recoverGoogleCalendarConnection(user.id).catch((error) => {
      console.error('Failed to recover Google Calendar connection', error);
    });

    await ensureGoogleCalendarWatches(user.id).catch((error) => {
      console.error('Failed to ensure Google Calendar watches', error);
    });

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
      watchExpiration: c.watchExpiration || '',
      watchLastWebhookAt: c.watchLastWebhookAt || '',
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ calendars: safe });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Connect flow - generates OAuth URLs for calendar providers
export async function POST(req: NextRequest) {
  try {
    await requireAuthWithScopes(['calendars:write']);

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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requireAuthWithScopes(['calendars:write']);
    const {
      calendarId,
      addEventsTo,
      checkForConflicts,
    } = await req.json();

    if (!calendarId || typeof calendarId !== 'string') {
      return NextResponse.json({ error: 'calendarId is required' }, { status: 400 });
    }

    const calendar = connectedCalendars().findById(calendarId);
    if (!calendar || calendar.userId !== user.id) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    const updates: Record<string, boolean> = {};

    if (typeof checkForConflicts === 'boolean') {
      updates.checkForConflicts = checkForConflicts;
    }

    if (typeof addEventsTo === 'boolean') {
      if (!calendar.provider || calendar.provider !== 'google') {
        return NextResponse.json(
          { error: 'Booking calendar selection is currently supported for Google calendars only' },
          { status: 400 },
        );
      }

      if (addEventsTo) {
        connectedCalendars().updateMany(
          { userId: user.id, provider: calendar.provider },
          { addEventsTo: false },
        );
        updates.addEventsTo = true;
      } else {
        const otherBookingCalendar = connectedCalendars().findMany({
          where: { userId: user.id, provider: calendar.provider, addEventsTo: true },
        }).find((item: any) => item.id !== calendar.id);

        if (!otherBookingCalendar) {
          return NextResponse.json(
            { error: 'At least one Google calendar must remain selected to receive booking events' },
            { status: 400 },
          );
        }

        updates.addEventsTo = false;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    const updated = connectedCalendars().update(calendar.id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update calendar' }, { status: 500 });
    }

    return NextResponse.json({
      calendar: {
        id: updated.id,
        provider: updated.provider,
        email: updated.email,
        accountEmail: updated.accountEmail || updated.email,
        accountExternalId: updated.accountExternalId || '',
        calendarId: updated.calendarId || '',
        calendarName: updated.calendarName || '',
        accessRole: updated.accessRole || '',
        checkForConflicts: updated.checkForConflicts,
        addEventsTo: updated.addEventsTo,
        isPrimary: updated.isPrimary,
        watchExpiration: updated.watchExpiration || '',
        watchLastWebhookAt: updated.watchLastWebhookAt || '',
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
