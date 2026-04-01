import { randomUUID } from 'crypto';
import { connectedCalendars } from './db';
import type { Booking, ConnectedCalendar, EventType, User } from './types';

type RawConnectedGoogleCalendar = ConnectedCalendar & {
  accountEmail?: string;
  accountExternalId?: string;
  calendarId?: string;
  calendarName?: string;
  accessRole?: string;
};

export type ConnectedGoogleCalendar = RawConnectedGoogleCalendar & {
  accountEmail: string;
  accountExternalId: string;
  calendarId: string;
  calendarName: string;
  accessRole: string;
};

export type BusyInterval = {
  start: string;
  end: string;
};

type GoogleCalendarListItem = {
  id: string;
  summary?: string;
  primary?: boolean;
  selected?: boolean;
  accessRole?: string;
};

type GoogleBookingEventResult = {
  connectedCalendarId: string;
  calendarId: string;
  eventId: string;
  htmlLink?: string;
  meetingUrl?: string | null;
};

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events.freebusy',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

function buildProviderAccountId(accountExternalId: string, calendarId: string) {
  return `${accountExternalId}:${encodeURIComponent(calendarId)}`;
}

function deriveAccountExternalId(calendar: RawConnectedGoogleCalendar) {
  if (calendar.accountExternalId) return calendar.accountExternalId;
  const [accountExternalId] = String(calendar.providerAccountId || '').split(':');
  return accountExternalId || calendar.providerAccountId || calendar.email;
}

function deriveCalendarId(calendar: RawConnectedGoogleCalendar) {
  if (calendar.calendarId) return calendar.calendarId;
  const providerAccountId = String(calendar.providerAccountId || '');
  const separatorIndex = providerAccountId.indexOf(':');
  if (separatorIndex === -1) return 'primary';
  return decodeURIComponent(providerAccountId.slice(separatorIndex + 1)) || 'primary';
}

function normalizeGoogleCalendar(calendar: RawConnectedGoogleCalendar): ConnectedGoogleCalendar {
  const accountEmail = calendar.accountEmail || calendar.email;
  const accountExternalId = deriveAccountExternalId(calendar);
  const calendarId = deriveCalendarId(calendar);

  return {
    ...calendar,
    accountEmail,
    accountExternalId,
    calendarId,
    calendarName: calendar.calendarName || (calendar.isPrimary ? 'Primary calendar' : calendarId),
    accessRole: calendar.accessRole || 'owner',
  };
}

function getAllConnectedGoogleCalendars(userId: string) {
  return connectedCalendars().findMany({
    where: {
      userId,
      provider: 'google',
    },
  }).map((calendar: RawConnectedGoogleCalendar) => normalizeGoogleCalendar(calendar));
}

function getCalendarsForSameGoogleAccount(calendar: ConnectedGoogleCalendar) {
  return getAllConnectedGoogleCalendars(calendar.userId).filter((item) => (
    item.accountExternalId === calendar.accountExternalId
    || item.accountEmail === calendar.accountEmail
  ));
}

function shouldRefreshToken(calendar: ConnectedGoogleCalendar) {
  if (!calendar.tokenExpiry) return false;

  const expiryMs = new Date(calendar.tokenExpiry).getTime();
  if (!Number.isFinite(expiryMs)) return false;

  return expiryMs <= Date.now() + 60_000;
}

export function buildGoogleCalendarOAuthUrl(baseUrl: string, clientId: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/integrations/calendars/google/callback`,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function canWriteGoogleCalendar(calendar: Pick<ConnectedGoogleCalendar, 'accessRole'>) {
  return ['owner', 'writer'].includes(calendar.accessRole);
}

async function refreshGoogleAccessToken(calendar: ConnectedGoogleCalendar) {
  if (!calendar.refreshToken) {
    return calendar.accessToken;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return calendar.accessToken;
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: calendar.refreshToken,
    }),
  });

  const refreshed = await tokenRes.json();
  if (!tokenRes.ok || !refreshed.access_token) {
    console.error('Failed to refresh Google Calendar token', {
      calendarId: calendar.id,
      email: calendar.accountEmail,
      status: tokenRes.status,
      error: refreshed,
    });
    return calendar.accessToken;
  }

  for (const sibling of getCalendarsForSameGoogleAccount(calendar)) {
    connectedCalendars().update(sibling.id, {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || sibling.refreshToken,
      tokenExpiry: refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        : sibling.tokenExpiry,
    });
  }

  return refreshed.access_token as string;
}

async function getValidAccessToken(calendar: ConnectedGoogleCalendar) {
  if (!calendar.accessToken || shouldRefreshToken(calendar)) {
    return refreshGoogleAccessToken(calendar);
  }

  return calendar.accessToken;
}

async function googleCalendarApiRequest(
  calendar: ConnectedGoogleCalendar,
  path: string,
  init?: RequestInit,
  query?: Record<string, string | undefined>,
) {
  const url = new URL(`https://www.googleapis.com/calendar/v3${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, value);
    });
  }

  const execute = async (accessToken: string) => fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  });

  let accessToken = await getValidAccessToken(calendar);
  let response = await execute(accessToken);

  if (response.status === 401 && calendar.refreshToken) {
    accessToken = await refreshGoogleAccessToken(calendar);
    response = await execute(accessToken);
  }

  return response;
}

async function fetchGoogleCalendarList(accessToken: string) {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&showDeleted=false&showHidden=false',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Failed to fetch Google calendar list');
  }

  return (data?.items || []) as GoogleCalendarListItem[];
}

export async function syncGoogleCalendarsFromOAuth(params: {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  accountEmail: string;
  accountExternalId: string;
}) {
  const {
    userId,
    accessToken,
    refreshToken,
    expiresIn,
    accountEmail,
    accountExternalId,
  } = params;

  const calendarList = await fetchGoogleCalendarList(accessToken);
  const normalizedExisting = getAllConnectedGoogleCalendars(userId);
  const existingForAccount = normalizedExisting.filter((calendar) => (
    calendar.accountExternalId === accountExternalId
    || calendar.accountEmail === accountEmail
  ));
  const existingByCalendarId = new Map(existingForAccount.map((calendar) => [calendar.calendarId, calendar]));
  const seenCalendarIds = new Set<string>();
  const hasAnyExistingAddTo = normalizedExisting.some((calendar) => (
    calendar.addEventsTo && !existingForAccount.some((item) => item.id === calendar.id)
  ));
  const existingAddToForAccount = existingForAccount.find((calendar) => calendar.addEventsTo);
  let assignedDefaultAddTo = hasAnyExistingAddTo || Boolean(existingAddToForAccount);

  for (const calendarItem of calendarList) {
    if (!calendarItem?.id) continue;

    const calendarId = calendarItem.id;
    const accessRole = calendarItem.accessRole || 'reader';
    const isWritable = ['owner', 'writer'].includes(accessRole);
    const existing = existingByCalendarId.get(calendarId);
    const shouldAddEventsTo = existing?.addEventsTo
      ?? (!assignedDefaultAddTo && isWritable && (Boolean(calendarItem.primary) || !calendarList.some((item) => item.primary && ['owner', 'writer'].includes(item.accessRole || 'reader'))));
    const data = {
      providerAccountId: buildProviderAccountId(accountExternalId, calendarId),
      email: accountEmail,
      accountEmail,
      accountExternalId,
      calendarId,
      calendarName: calendarItem.summary || (calendarItem.primary ? 'Primary calendar' : calendarId),
      accessRole,
      accessToken,
      refreshToken: refreshToken || existing?.refreshToken || '',
      tokenExpiry: expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : existing?.tokenExpiry || '',
      checkForConflicts: existing?.checkForConflicts ?? calendarItem.selected !== false,
      addEventsTo: shouldAddEventsTo,
      isPrimary: Boolean(calendarItem.primary),
    };

    if (shouldAddEventsTo) {
      assignedDefaultAddTo = true;
    }

    if (existing) {
      connectedCalendars().update(existing.id, data);
    } else {
      connectedCalendars().create({
        userId,
        provider: 'google',
        ...data,
      });
    }

    seenCalendarIds.add(calendarId);
  }

  for (const staleCalendar of existingForAccount) {
    if (!seenCalendarIds.has(staleCalendar.calendarId)) {
      connectedCalendars().delete(staleCalendar.id);
    }
  }
}

export async function updateGoogleCalendarSettings(params: {
  userId: string;
  calendarId: string;
  checkForConflicts?: boolean;
  addEventsTo?: boolean;
}) {
  const calendar = getAllConnectedGoogleCalendars(params.userId).find((item) => item.id === params.calendarId);
  if (!calendar) return null;

  const updates: Partial<ConnectedCalendar> & Record<string, any> = {};
  if (typeof params.checkForConflicts === 'boolean') {
    updates.checkForConflicts = params.checkForConflicts;
  }

  if (typeof params.addEventsTo === 'boolean') {
    if (params.addEventsTo && !canWriteGoogleCalendar(calendar)) {
      throw new Error('This calendar is read-only and cannot receive new bookings.');
    }

    if (params.addEventsTo) {
      for (const item of getAllConnectedGoogleCalendars(params.userId)) {
        if (item.id !== calendar.id && item.addEventsTo) {
          connectedCalendars().update(item.id, { addEventsTo: false });
        }
      }
    }

    updates.addEventsTo = params.addEventsTo;
  }

  return connectedCalendars().update(calendar.id, updates);
}

function groupCalendarsByAccount(calendars: ConnectedGoogleCalendar[]) {
  const groups = new Map<string, ConnectedGoogleCalendar[]>();

  for (const calendar of calendars) {
    const key = `${calendar.accountExternalId}:${calendar.accountEmail}`;
    const items = groups.get(key) || [];
    items.push(calendar);
    groups.set(key, items);
  }

  return [...groups.values()];
}

export async function getGoogleCalendarBusyIntervals(
  userId: string,
  timeMin: string,
  timeMax: string,
): Promise<BusyInterval[]> {
  const calendars = getAllConnectedGoogleCalendars(userId).filter((calendar) => calendar.checkForConflicts);
  if (calendars.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    groupCalendarsByAccount(calendars).map(async (accountCalendars) => {
      const representative = accountCalendars[0];
      const response = await googleCalendarApiRequest(
        representative,
        '/freeBusy',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timeMin,
            timeMax,
            items: accountCalendars.map((calendar) => ({ id: calendar.calendarId })),
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Calendar freeBusy request failed', {
          accountEmail: representative.accountEmail,
          status: response.status,
          errorText,
        });
        return [];
      }

      const data = await response.json();
      return accountCalendars.flatMap((calendar) => {
        const busy = data?.calendars?.[calendar.calendarId]?.busy;
        if (!Array.isArray(busy)) return [];
        return busy
          .filter((interval: any) => interval?.start && interval?.end)
          .map((interval: any) => ({
            start: String(interval.start),
            end: String(interval.end),
          })) satisfies BusyInterval[];
      });
    }),
  );

  return results.flatMap((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    console.error('Google Calendar freeBusy lookup failed', result.reason);
    return [];
  });
}

export function hasBusyIntervalConflict(
  busyIntervals: BusyInterval[],
  start: Date,
  end: Date,
) {
  return busyIntervals.some((interval) => {
    const busyStart = new Date(interval.start);
    const busyEnd = new Date(interval.end);
    return start < busyEnd && end > busyStart;
  });
}

export async function hasGoogleCalendarConflict(
  userId: string,
  start: Date,
  end: Date,
) {
  const busyIntervals = await getGoogleCalendarBusyIntervals(
    userId,
    start.toISOString(),
    end.toISOString(),
  );

  return hasBusyIntervalConflict(busyIntervals, start, end);
}

export function getGoogleAddToCalendar(userId: string) {
  return getAllConnectedGoogleCalendars(userId).find((calendar) => (
    calendar.addEventsTo && canWriteGoogleCalendar(calendar)
  )) || null;
}

function buildGoogleEventDescription(params: {
  booking: Booking;
  eventType: EventType;
  host: User;
}) {
  const { booking, eventType, host } = params;
  const lines = [
    `Booked via KalendR`,
    ``,
    `Host: ${host.name} <${host.email}>`,
    `Invitee: ${booking.inviteeName} <${booking.inviteeEmail}>`,
  ];

  if (booking.inviteeCompany) lines.push(`Company: ${booking.inviteeCompany}`);
  if (booking.inviteeJobTitle) lines.push(`Job title: ${booking.inviteeJobTitle}`);
  if (booking.inviteePhone) lines.push(`Phone: ${booking.inviteePhone}`);
  if (booking.inviteeNotes) {
    lines.push(``);
    lines.push(`Notes:`);
    lines.push(booking.inviteeNotes);
  }

  if (booking.customResponses) {
    try {
      const customResponses = JSON.parse(booking.customResponses);
      if (customResponses && typeof customResponses === 'object') {
        lines.push(``);
        lines.push(`Responses:`);
        for (const [key, value] of Object.entries(customResponses)) {
          lines.push(`${key}: ${String(value)}`);
        }
      }
    } catch {}
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io').replace(/\/$/, '');
  lines.push(``);
  lines.push(`Reschedule: ${appUrl}/booking/${booking.uid}/reschedule?token=${booking.rescheduleToken}`);
  lines.push(`Cancel: ${appUrl}/booking/${booking.uid}/cancel?token=${booking.cancelToken}`);
  lines.push(``);
  lines.push(`Event type: ${eventType.title}`);

  return lines.join('\n');
}

export async function createGoogleCalendarEventForBooking(params: {
  booking: Booking;
  eventType: EventType;
  host: User;
}) {
  const { booking, eventType, host } = params;
  const calendar = getGoogleAddToCalendar(booking.hostId);
  if (!calendar) {
    return null;
  }

  const body: Record<string, any> = {
    summary: eventType.title,
    description: buildGoogleEventDescription({ booking, eventType, host }),
    start: {
      dateTime: booking.startTime,
      timeZone: host.timezone || booking.timezone,
    },
    end: {
      dateTime: booking.endTime,
      timeZone: host.timezone || booking.timezone,
    },
    attendees: [
      {
        email: booking.inviteeEmail,
        displayName: booking.inviteeName,
      },
    ],
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    extendedProperties: {
      private: {
        kalendrBookingId: booking.id,
        kalendrBookingUid: booking.uid,
      },
    },
  };

  if (booking.locationType === 'google_meet') {
    body.conferenceData = {
      createRequest: {
        requestId: randomUUID(),
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    };
  } else if (booking.locationValue) {
    body.location = booking.locationValue;
  }

  const response = await googleCalendarApiRequest(
    calendar,
    `/calendars/${encodeURIComponent(calendar.calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    {
      sendUpdates: 'all',
      conferenceDataVersion: booking.locationType === 'google_meet' ? '1' : undefined,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Calendar event creation failed', {
      calendarId: calendar.calendarId,
      status: response.status,
      errorText,
    });
    return null;
  }

  const data = await response.json();
  const entryPoint = Array.isArray(data?.conferenceData?.entryPoints)
    ? data.conferenceData.entryPoints.find((point: any) => point?.entryPointType === 'video')
    : null;
  const meetingUrl = entryPoint?.uri || data?.hangoutLink || null;

  return {
    connectedCalendarId: calendar.id,
    calendarId: calendar.calendarId,
    eventId: data.id,
    htmlLink: data.htmlLink || '',
    meetingUrl,
  } satisfies GoogleBookingEventResult;
}

export async function deleteGoogleCalendarEventForBooking(params: {
  userId: string;
  eventId?: string | null;
  connectedCalendarId?: string | null;
  calendarId?: string | null;
}) {
  const { userId, eventId, connectedCalendarId, calendarId } = params;
  if (!eventId) return false;

  const calendars = getAllConnectedGoogleCalendars(userId);
  const calendar = calendars.find((item) => item.id === connectedCalendarId)
    || calendars.find((item) => item.calendarId === calendarId && item.addEventsTo)
    || getGoogleAddToCalendar(userId);

  if (!calendar) {
    return false;
  }

  const response = await googleCalendarApiRequest(
    calendar,
    `/calendars/${encodeURIComponent(calendarId || calendar.calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
    },
    {
      sendUpdates: 'all',
    },
  );

  if (response.status === 404) {
    return true;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Calendar event deletion failed', {
      calendarId: calendar.calendarId,
      eventId,
      status: response.status,
      errorText,
    });
    return false;
  }

  return true;
}
