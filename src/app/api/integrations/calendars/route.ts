import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithScopes } from '@/lib/auth';
import { connectedCalendars } from '@/lib/db';
import {
  buildGoogleCalendarOAuthUrl,
  disconnectGoogleCalendar,
  ensureGoogleCalendarWatches,
  recoverGoogleCalendarConnection,
} from '@/lib/google-calendar';
import { getIntegrationSetupStatus } from '@/lib/integration-config';

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
      const setup = getIntegrationSetupStatus('google');
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!setup.isConfigured || !clientId) {
        return NextResponse.json({
          error: 'Google Calendar integration not configured',
          message: setup.helpText,
          missingEnvVars: setup.missingEnvVars,
          stubbed: true,
        }, { status: 501 });
      }

      return NextResponse.json({ url: buildGoogleCalendarOAuthUrl(baseUrl, clientId) });
    }

    if (provider === 'microsoft') {
      const setup = getIntegrationSetupStatus('microsoft');
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      if (!setup.isConfigured || !clientId) {
        return NextResponse.json({
          error: 'Microsoft Calendar integration not configured',
          message: setup.helpText,
          missingEnvVars: setup.missingEnvVars,
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

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireAuthWithScopes(['calendars:write']);
    const { calendarId, provider } = await req.json();

    if (provider && typeof provider === 'string') {
      if (provider !== 'google') {
        return NextResponse.json({ error: 'Bulk disconnect is only supported for Google calendars' }, { status: 400 });
      }

      const googleCalendars = connectedCalendars().findMany({
        where: { userId: user.id, provider: 'google' },
      }) as any[];

      if (googleCalendars.length === 0) {
        return NextResponse.json({ error: 'No Google calendars connected' }, { status: 404 });
      }

      let removedCount = 0;
      for (const calendar of googleCalendars) {
        const removed = await disconnectGoogleCalendar({ userId: user.id, calendarId: calendar.id });
        if (removed) removedCount += 1;
      }

      if (removedCount === 0) {
        return NextResponse.json({ error: 'Failed to disconnect Google calendars' }, { status: 500 });
      }

      return NextResponse.json({ success: true, removedCount });
    }

    if (!calendarId || typeof calendarId !== 'string') {
      return NextResponse.json({ error: 'calendarId is required' }, { status: 400 });
    }

    const calendar = connectedCalendars().findById(calendarId);
    if (!calendar || calendar.userId !== user.id) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    let removed = false;
    if (calendar.provider === 'google') {
      removed = await disconnectGoogleCalendar({ userId: user.id, calendarId: calendar.id });
    } else {
      removed = connectedCalendars().delete(calendar.id);
    }

    if (!removed) {
      return NextResponse.json({ error: 'Failed to disconnect calendar' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
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
