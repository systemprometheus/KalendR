import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { bookings, connectedCalendars, integrations } from './db';
import { getJwtSecret } from './auth';
import type { Booking, ConnectedCalendar, EventType, User } from './types';

type RawConnectedGoogleCalendar = ConnectedCalendar & {
  accountEmail?: string;
  accountExternalId?: string;
  calendarId?: string;
  calendarName?: string;
  accessRole?: string;
  watchChannelId?: string;
  watchResourceId?: string;
  watchResourceUri?: string;
  watchExpiration?: string;
  watchToken?: string;
  watchCursorUpdatedAt?: string;
  watchLastWebhookAt?: string;
  watchLastMessageNumber?: number;
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

type GoogleCalendarEventDateTime = {
  dateTime?: string;
  date?: string;
  timeZone?: string;
};

type GoogleCalendarEvent = {
  id: string;
  status?: string;
  updated?: string;
  htmlLink?: string;
  hangoutLink?: string;
  location?: string;
  start?: GoogleCalendarEventDateTime;
  end?: GoogleCalendarEventDateTime;
  conferenceData?: {
    createRequest?: {
      status?: {
        statusCode?: string;
      };
    };
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
    }>;
  };
  extendedProperties?: {
    private?: Record<string, string | undefined>;
  };
};

type GoogleWatchNotification = {
  channelId: string;
  channelToken: string;
  resourceId: string;
  resourceState: string;
  messageNumber: number;
};

type GoogleBookingEventResult = {
  connectedCalendarId: string;
  calendarId: string;
  eventId: string;
  htmlLink?: string;
  meetingUrl?: string | null;
};

type GoogleConferenceStatus = 'pending' | 'success' | 'failure' | null;

type LegacyGoogleMeetIntegration = {
  id: string;
  userId: string;
  provider: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: string;
  email?: string;
  externalId?: string;
};

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

function getGoogleInternalSecret() {
  return getJwtSecret();
}
const GOOGLE_WATCH_RENEW_WINDOW_MS = 24 * 60 * 60 * 1000;
const GOOGLE_WATCH_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const GOOGLE_WATCH_CURSOR_LOOKBACK_MS = 5 * 60 * 1000;

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

function parseBookingMetadata(metadata?: string | null) {
  if (!metadata) return {};

  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

function extractGoogleCalendarMetadata(metadata?: string | null) {
  const parsed = parseBookingMetadata(metadata);
  const googleCalendar = parsed?.googleCalendar;

  if (!googleCalendar || typeof googleCalendar !== 'object') {
    return null;
  }

  return {
    connectedCalendarId: googleCalendar.connectedCalendarId ? String(googleCalendar.connectedCalendarId) : '',
    calendarId: googleCalendar.calendarId ? String(googleCalendar.calendarId) : '',
    eventId: googleCalendar.eventId ? String(googleCalendar.eventId) : '',
    htmlLink: googleCalendar.htmlLink ? String(googleCalendar.htmlLink) : '',
  };
}

function buildBookingEventKey(eventId?: string, calendarId?: string) {
  if (!eventId) return '';
  return `${calendarId || 'primary'}:${eventId}`;
}

function getAppBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io').replace(/\/$/, '');
}

function canUseGoogleCalendarWebhooks() {
  return (process.env.NEXT_PUBLIC_APP_URL || '').trim().startsWith('https://');
}

function getGoogleCalendarWatchCallbackUrl() {
  return `${getAppBaseUrl()}/api/integrations/calendars/google/watch`;
}

function buildGoogleWatchSignature(calendar: ConnectedGoogleCalendar) {
  return createHmac('sha256', getGoogleInternalSecret())
    .update(`${calendar.id}:${calendar.userId}:${calendar.calendarId}`)
    .digest('hex');
}

function buildGoogleWatchToken(calendar: ConnectedGoogleCalendar) {
  return new URLSearchParams({
    calendarId: calendar.id,
    sig: buildGoogleWatchSignature(calendar),
  }).toString();
}

function hasValidGoogleWatchToken(calendar: ConnectedGoogleCalendar, token: string) {
  const params = new URLSearchParams(token);
  const calendarId = params.get('calendarId');
  const signature = params.get('sig');
  if (!calendarId || !signature || calendarId !== calendar.id) {
    return false;
  }

  const expected = buildGoogleWatchSignature(calendar);
  if (expected.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
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

function getGoogleCalendarsRequiringWatch(userId: string) {
  const calendars = getAllConnectedGoogleCalendars(userId);
  const calendarIds = new Set<string>(
    calendars
      .filter((calendar) => calendar.addEventsTo)
      .map((calendar) => calendar.id),
  );

  const now = Date.now();
  const hostBookings = bookings().findMany({ where: { hostId: userId } }) as Booking[];

  for (const booking of hostBookings) {
    if (booking.status !== 'confirmed') continue;
    if (new Date(booking.endTime).getTime() < now) continue;

    const googleMetadata = extractGoogleCalendarMetadata(booking.metadata);
    if (!googleMetadata?.eventId) continue;

    if (googleMetadata.connectedCalendarId) {
      calendarIds.add(googleMetadata.connectedCalendarId);
      continue;
    }

    const matchingCalendar = calendars.find((calendar) => calendar.calendarId === googleMetadata.calendarId);
    if (matchingCalendar) {
      calendarIds.add(matchingCalendar.id);
    }
  }

  return calendars.filter((calendar) => calendarIds.has(calendar.id));
}

function clearGoogleCalendarWatchState(calendarId: string, options?: { preserveCursor?: boolean }) {
  const updates: Record<string, any> = {
    watchChannelId: '',
    watchResourceId: '',
    watchResourceUri: '',
    watchExpiration: '',
    watchToken: '',
    watchLastWebhookAt: '',
    watchLastMessageNumber: undefined,
  };

  if (!options?.preserveCursor) {
    updates.watchCursorUpdatedAt = '';
  }

  connectedCalendars().update(calendarId, updates);
}

function isGoogleCalendarWatchFresh(calendar: ConnectedGoogleCalendar) {
  if (!calendar.watchChannelId || !calendar.watchResourceId || !calendar.watchToken || !calendar.watchExpiration) {
    return false;
  }

  const expirationMs = new Date(calendar.watchExpiration).getTime();
  if (!Number.isFinite(expirationMs)) {
    return false;
  }

  return expirationMs > Date.now() + GOOGLE_WATCH_RENEW_WINDOW_MS;
}

function shouldRefreshToken(calendar: ConnectedGoogleCalendar) {
  if (!calendar.tokenExpiry) return false;

  const expiryMs = new Date(calendar.tokenExpiry).getTime();
  if (!Number.isFinite(expiryMs)) return false;

  return expiryMs <= Date.now() + 60_000;
}

function shouldRefreshLegacyGoogleToken(tokenExpiry?: string) {
  if (!tokenExpiry) return false;

  const expiryMs = new Date(tokenExpiry).getTime();
  if (!Number.isFinite(expiryMs)) return false;

  return expiryMs <= Date.now() + 60_000;
}

function getLegacyGoogleMeetIntegration(userId: string) {
  return integrations().findFirst({
    where: {
      userId,
      provider: 'google_meet',
    },
  }) as LegacyGoogleMeetIntegration | null;
}

async function refreshLegacyGoogleMeetAccessToken(integration: LegacyGoogleMeetIntegration) {
  if (!integration.refreshToken) {
    return integration.accessToken || '';
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return integration.accessToken || '';
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: integration.refreshToken,
    }),
  });

  const refreshed = await tokenRes.json();
  if (!tokenRes.ok || !refreshed.access_token) {
    console.error('Failed to refresh legacy Google Meet token', {
      integrationId: integration.id,
      email: integration.email,
      status: tokenRes.status,
      error: refreshed,
    });
    return integration.accessToken || '';
  }

  const updated = integrations().update(integration.id, {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || integration.refreshToken,
    tokenExpiry: refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      : integration.tokenExpiry || '',
  }) as LegacyGoogleMeetIntegration | null;

  return updated?.accessToken || refreshed.access_token || '';
}

async function getValidLegacyGoogleMeetAccessToken(integration: LegacyGoogleMeetIntegration) {
  if (!integration.accessToken || shouldRefreshLegacyGoogleToken(integration.tokenExpiry)) {
    return refreshLegacyGoogleMeetAccessToken(integration);
  }

  return integration.accessToken;
}

function getRemainingTokenLifetimeSeconds(tokenExpiry?: string) {
  if (!tokenExpiry) return undefined;

  const expiryMs = new Date(tokenExpiry).getTime();
  if (!Number.isFinite(expiryMs)) return undefined;

  const remainingSeconds = Math.floor((expiryMs - Date.now()) / 1000);
  return remainingSeconds > 0 ? remainingSeconds : undefined;
}

async function getLegacyGoogleMeetIdentity(
  integration: LegacyGoogleMeetIntegration,
  accessToken: string,
) {
  const email = integration.email?.trim();
  const externalId = integration.externalId?.trim();

  if (email && externalId) {
    return { email, externalId };
  }

  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch legacy Google Meet identity', {
      integrationId: integration.id,
      status: response.status,
      errorText,
    });
    return null;
  }

  const data = await response.json();
  const resolvedEmail = String(data?.email || '').trim();
  const resolvedExternalId = String(data?.id || resolvedEmail).trim();

  if (!resolvedEmail || !resolvedExternalId) {
    return null;
  }

  integrations().update(integration.id, {
    email: resolvedEmail,
    externalId: resolvedExternalId,
  });

  return {
    email: resolvedEmail,
    externalId: resolvedExternalId,
  };
}

export async function recoverGoogleCalendarConnection(userId: string) {
  const existingCalendar = getGoogleAddToCalendar(userId);
  if (existingCalendar) {
    return existingCalendar;
  }

  const legacyIntegration = getLegacyGoogleMeetIntegration(userId);
  if (!legacyIntegration) {
    return null;
  }

  const accessToken = await getValidLegacyGoogleMeetAccessToken(legacyIntegration);
  if (!accessToken) {
    console.warn('Legacy Google Meet integration has no usable access token', {
      integrationId: legacyIntegration.id,
      userId,
    });
    return null;
  }

  const identity = await getLegacyGoogleMeetIdentity(legacyIntegration, accessToken);
  if (!identity) {
    console.warn('Legacy Google Meet integration is missing account identity', {
      integrationId: legacyIntegration.id,
      userId,
    });
    return null;
  }

  try {
    await syncGoogleCalendarsFromOAuth({
      userId,
      accessToken,
      refreshToken: legacyIntegration.refreshToken || '',
      expiresIn: getRemainingTokenLifetimeSeconds(legacyIntegration.tokenExpiry),
      accountEmail: identity.email,
      accountExternalId: identity.externalId,
    });
  } catch (error) {
    console.error('Failed to recover Google Calendar connection from legacy Google Meet integration', {
      integrationId: legacyIntegration.id,
      userId,
      error,
    });
    return null;
  }

  return getGoogleAddToCalendar(userId);
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
  // Older synced calendar records may not have stored accessRole yet.
  // Treat those as potentially writable and let the Google API enforce permissions.
  return !calendar.accessRole || ['owner', 'writer'].includes(calendar.accessRole);
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

async function stopGoogleCalendarWatch(calendar: ConnectedGoogleCalendar) {
  if (!calendar.watchChannelId || !calendar.watchResourceId) {
    return false;
  }

  const response = await googleCalendarApiRequest(
    calendar,
    '/channels/stop',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: calendar.watchChannelId,
        resourceId: calendar.watchResourceId,
      }),
    },
  );

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    console.error('Google Calendar watch stop failed', {
      calendarId: calendar.calendarId,
      status: response.status,
      errorText,
    });
    return false;
  }

  return true;
}

async function registerGoogleCalendarWatch(calendar: ConnectedGoogleCalendar) {
  if (!canUseGoogleCalendarWebhooks()) {
    return null;
  }

  const channelId = randomUUID();
  const watchToken = buildGoogleWatchToken(calendar);
  const watchCursorUpdatedAt = calendar.watchCursorUpdatedAt
    || new Date(Date.now() - GOOGLE_WATCH_CURSOR_LOOKBACK_MS).toISOString();

  connectedCalendars().update(calendar.id, {
    watchToken,
    watchCursorUpdatedAt,
  });

  const response = await googleCalendarApiRequest(
    calendar,
    `/calendars/${encodeURIComponent(calendar.calendarId)}/events/watch`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: getGoogleCalendarWatchCallbackUrl(),
        token: watchToken,
        expiration: String(Date.now() + GOOGLE_WATCH_REQUEST_TTL_MS),
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Calendar watch registration failed', {
      calendarId: calendar.calendarId,
      status: response.status,
      errorText,
    });
    clearGoogleCalendarWatchState(calendar.id, { preserveCursor: true });
    connectedCalendars().update(calendar.id, {
      watchCursorUpdatedAt,
    });
    return null;
  }

  const data = await response.json();
  const expirationMs = Number(data?.expiration);
  const updated = connectedCalendars().update(calendar.id, {
    watchChannelId: String(data?.id || channelId),
    watchResourceId: data?.resourceId ? String(data.resourceId) : '',
    watchResourceUri: data?.resourceUri ? String(data.resourceUri) : '',
    watchExpiration: Number.isFinite(expirationMs) && expirationMs > 0
      ? new Date(expirationMs).toISOString()
      : new Date(Date.now() + GOOGLE_WATCH_REQUEST_TTL_MS).toISOString(),
    watchToken,
    watchCursorUpdatedAt,
  });

  return updated ? normalizeGoogleCalendar(updated as RawConnectedGoogleCalendar) : null;
}

export async function ensureGoogleCalendarWatches(userId: string) {
  const allCalendars = getAllConnectedGoogleCalendars(userId);
  const desiredCalendars = getGoogleCalendarsRequiringWatch(userId);
  const desiredIds = new Set(desiredCalendars.map((calendar) => calendar.id));

  for (const calendar of allCalendars) {
    if (desiredIds.has(calendar.id)) continue;
    if (!calendar.watchChannelId && !calendar.watchResourceId && !calendar.watchToken) continue;

    await stopGoogleCalendarWatch(calendar).catch((error) => {
      console.error('Failed to stop unused Google Calendar watch', error);
    });
    clearGoogleCalendarWatchState(calendar.id);
  }

  if (!canUseGoogleCalendarWebhooks()) {
    return;
  }

  for (const calendar of desiredCalendars) {
    const latest = normalizeGoogleCalendar(
      (connectedCalendars().findById(calendar.id) as RawConnectedGoogleCalendar) || calendar,
    );

    if (isGoogleCalendarWatchFresh(latest)) {
      continue;
    }

    if (latest.watchChannelId && latest.watchResourceId) {
      await stopGoogleCalendarWatch(latest).catch((error) => {
        console.error('Failed to renew Google Calendar watch cleanly', error);
      });
      clearGoogleCalendarWatchState(latest.id, { preserveCursor: true });
    }

    await registerGoogleCalendarWatch(latest);
  }
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
      ?? (!assignedDefaultAddTo && isWritable && (
        Boolean(calendarItem.primary)
        || !calendarList.some((item) => item.primary && ['owner', 'writer'].includes(item.accessRole || 'reader'))
      ));

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
      await stopGoogleCalendarWatch(staleCalendar).catch((error) => {
        console.error('Failed to stop stale Google Calendar watch', error);
      });
      connectedCalendars().delete(staleCalendar.id);
    }
  }

  await ensureGoogleCalendarWatches(userId);
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
  let calendars = getAllConnectedGoogleCalendars(userId).filter((calendar) => calendar.checkForConflicts);
  if (calendars.length === 0) {
    await recoverGoogleCalendarConnection(userId);
    calendars = getAllConnectedGoogleCalendars(userId).filter((calendar) => calendar.checkForConflicts);
  }
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
        return [] as BusyInterval[];
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
          }));
      });
    }),
  );

  return results.flatMap((result) => (
    result.status === 'fulfilled' ? result.value : []
  ));
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
  const calendars = getAllConnectedGoogleCalendars(userId);
  if (calendars.length === 0) {
    return null;
  }

  const writableCalendars = calendars.filter((calendar) => canWriteGoogleCalendar(calendar));
  const selected = writableCalendars.find((calendar) => calendar.addEventsTo)
    || writableCalendars.find((calendar) => calendar.isPrimary)
    || writableCalendars[0]
    || calendars.find((calendar) => calendar.addEventsTo)
    || calendars.find((calendar) => calendar.isPrimary)
    || calendars[0]
    || null;

  if (!selected) {
    return null;
  }

  if (!selected.addEventsTo) {
    connectedCalendars().updateMany({ userId, provider: 'google' }, { addEventsTo: false });
    const updated = connectedCalendars().update(selected.id, { addEventsTo: true });
    return normalizeGoogleCalendar((updated as RawConnectedGoogleCalendar) || {
      ...selected,
      addEventsTo: true,
    });
  }

  return selected;
}

function buildGoogleEventDescription(params: {
  booking: Booking;
  eventType: EventType;
  host: User;
}) {
  const { booking, eventType, host } = params;
  const lines = [
    'Booked via KalendR',
    '',
    `Host: ${host.name} <${host.email}>`,
    `Invitee: ${booking.inviteeName} <${booking.inviteeEmail}>`,
  ];

  if (booking.inviteeCompany) lines.push(`Company: ${booking.inviteeCompany}`);
  if (booking.inviteeJobTitle) lines.push(`Job title: ${booking.inviteeJobTitle}`);
  if (booking.inviteePhone) lines.push(`Phone: ${booking.inviteePhone}`);
  if (booking.inviteeNotes) {
    lines.push('');
    lines.push('Notes:');
    lines.push(booking.inviteeNotes);
  }

  if (booking.customResponses) {
    try {
      const customResponses = JSON.parse(booking.customResponses);
      if (customResponses && typeof customResponses === 'object') {
        lines.push('');
        lines.push('Responses:');
        for (const [key, value] of Object.entries(customResponses)) {
          lines.push(`${key}: ${String(value)}`);
        }
      }
    } catch {}
  }

  const appUrl = getAppBaseUrl();
  lines.push('');
  lines.push(`Reschedule: ${appUrl}/booking/${booking.uid}/reschedule?token=${booking.rescheduleToken}`);
  lines.push(`Cancel: ${appUrl}/booking/${booking.uid}/cancel?token=${booking.cancelToken}`);
  lines.push('');
  lines.push(`Event type: ${eventType.title}`);

  return lines.join('\n');
}

function bookingWantsGoogleMeet(booking: Booking, eventType?: EventType | null) {
  const looksLikeMeet = (value?: string | null) => Boolean(value && value.toLowerCase().includes('google meet'));

  return booking.locationType === 'google_meet'
    || eventType?.locationType === 'google_meet'
    || looksLikeMeet(booking.locationValue)
    || looksLikeMeet(eventType?.locationValue);
}

function extractGoogleMeetingUrl(event: Pick<GoogleCalendarEvent, 'conferenceData' | 'hangoutLink'>) {
  const entryPoint = Array.isArray(event.conferenceData?.entryPoints)
    ? event.conferenceData.entryPoints.find((point) => point?.entryPointType === 'video')
    : null;

  return entryPoint?.uri || event.hangoutLink || null;
}

function extractGoogleConferenceStatus(event?: Pick<GoogleCalendarEvent, 'conferenceData'> | null): GoogleConferenceStatus {
  const statusCode = event?.conferenceData?.createRequest?.status?.statusCode;
  if (statusCode === 'pending' || statusCode === 'success' || statusCode === 'failure') {
    return statusCode;
  }

  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchGoogleCalendarEvent(
  calendar: ConnectedGoogleCalendar,
  eventId: string,
) {
  const response = await googleCalendarApiRequest(
    calendar,
    `/calendars/${encodeURIComponent(calendar.calendarId)}/events/${encodeURIComponent(eventId)}`,
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Calendar event fetch failed', {
      calendarId: calendar.calendarId,
      eventId,
      status: response.status,
      errorText,
    });
    return null;
  }

  return await response.json() as GoogleCalendarEvent;
}

async function requestGoogleMeetConference(
  calendar: ConnectedGoogleCalendar,
  eventId: string,
) {
  const response = await googleCalendarApiRequest(
    calendar,
    `/calendars/${encodeURIComponent(calendar.calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      }),
    },
    {
      conferenceDataVersion: '1',
      sendUpdates: 'all',
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Meet conference patch failed', {
      calendarId: calendar.calendarId,
      eventId,
      status: response.status,
      errorText,
    });
    return null;
  }

  return await response.json() as GoogleCalendarEvent;
}

async function waitForGoogleMeetConference(
  calendar: ConnectedGoogleCalendar,
  eventId: string,
) {
  let latestEvent: GoogleCalendarEvent | null = null;
  let meetingUrl: string | null = null;
  let htmlLink = '';
  let conferenceStatus: GoogleConferenceStatus = null;

  for (const delayMs of [400, 900, 1800, 3200, 5000]) {
    await sleep(delayMs);
    latestEvent = await fetchGoogleCalendarEvent(calendar, eventId);

    if (!latestEvent) {
      continue;
    }

    meetingUrl = extractGoogleMeetingUrl(latestEvent);
    htmlLink = latestEvent.htmlLink || htmlLink;
    conferenceStatus = extractGoogleConferenceStatus(latestEvent);

    if (meetingUrl || conferenceStatus === 'success' || conferenceStatus === 'failure') {
      break;
    }
  }

  return {
    latestEvent,
    meetingUrl,
    htmlLink,
    conferenceStatus,
  };
}

function getGoogleMeetFallbackCalendar(
  userId: string,
  currentCalendar: ConnectedGoogleCalendar,
) {
  const calendars = getAllConnectedGoogleCalendars(userId)
    .filter((calendar) => canWriteGoogleCalendar(calendar));

  return calendars.find((calendar) => (
    calendar.id !== currentCalendar.id
    && calendar.accountExternalId === currentCalendar.accountExternalId
    && calendar.isPrimary
  )) || calendars.find((calendar) => (
    calendar.id !== currentCalendar.id
    && calendar.isPrimary
  )) || null;
}

function getPreferredGoogleMeetCalendar(
  userId: string,
  currentCalendar: ConnectedGoogleCalendar,
) {
  const calendars = getAllConnectedGoogleCalendars(userId)
    .filter((calendar) => canWriteGoogleCalendar(calendar));

  return calendars.find((calendar) => (
    calendar.accountExternalId === currentCalendar.accountExternalId
    && calendar.isPrimary
  )) || calendars.find((calendar) => calendar.isPrimary) || currentCalendar;
}

async function createGoogleCalendarEventOnCalendar(params: {
  calendar: ConnectedGoogleCalendar;
  booking: Booking;
  eventType: EventType;
  host: User;
  wantsGoogleMeet: boolean;
}) {
  const { calendar, booking, eventType, host, wantsGoogleMeet } = params;
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
        email: host.email,
        displayName: host.name,
      },
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

  if (wantsGoogleMeet) {
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
      conferenceDataVersion: wantsGoogleMeet ? '1' : undefined,
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

  const data = await response.json() as GoogleCalendarEvent;
  let meetingUrl = extractGoogleMeetingUrl(data);
  let htmlLink = data.htmlLink || '';
  let conferenceStatus = extractGoogleConferenceStatus(data);

  if (wantsGoogleMeet && data?.id && !meetingUrl && conferenceStatus !== 'failure') {
    const awaitedConference = await waitForGoogleMeetConference(calendar, String(data.id));
    meetingUrl = awaitedConference.meetingUrl || meetingUrl;
    htmlLink = awaitedConference.htmlLink || htmlLink;
    conferenceStatus = awaitedConference.conferenceStatus || conferenceStatus;
  }

  if (wantsGoogleMeet && data?.id && !meetingUrl && conferenceStatus !== 'success') {
    const patchedEvent = await requestGoogleMeetConference(calendar, String(data.id));
    if (patchedEvent) {
      meetingUrl = extractGoogleMeetingUrl(patchedEvent) || meetingUrl;
      htmlLink = patchedEvent.htmlLink || htmlLink;
      conferenceStatus = extractGoogleConferenceStatus(patchedEvent) || conferenceStatus;
    }

    if (!meetingUrl && conferenceStatus !== 'failure') {
      const awaitedConference = await waitForGoogleMeetConference(calendar, String(data.id));
      meetingUrl = awaitedConference.meetingUrl || meetingUrl;
      htmlLink = awaitedConference.htmlLink || htmlLink;
      conferenceStatus = awaitedConference.conferenceStatus || conferenceStatus;
    }
  }

  return {
    connectedCalendarId: calendar.id,
    calendarId: calendar.calendarId,
    eventId: data.id,
    htmlLink,
    meetingUrl,
    conferenceStatus,
  };
}

export async function createGoogleCalendarEventForBooking(params: {
  booking: Booking;
  eventType: EventType;
  host: User;
}) {
  const { booking, eventType, host } = params;
  const looksLikeMeet = (value?: string | null) => Boolean(value && value.toLowerCase().includes('google meet'));
  const wantsGoogleMeet =
    booking.locationType === 'google_meet'
    || eventType.locationType === 'google_meet'
    || looksLikeMeet(booking.locationValue)
    || looksLikeMeet(eventType.locationValue);
  let calendar = getGoogleAddToCalendar(booking.hostId);
  if (!calendar) {
    calendar = await recoverGoogleCalendarConnection(booking.hostId);
  }
  if (!calendar) {
    console.warn('No Google booking calendar available for booking', {
      bookingId: booking.id,
      hostId: booking.hostId,
      wantsGoogleMeet,
      locationType: booking.locationType || eventType.locationType,
    });
    return null;
  }

  if (wantsGoogleMeet) {
    const preferredMeetCalendar = getPreferredGoogleMeetCalendar(booking.hostId, calendar);
    if (preferredMeetCalendar.id !== calendar.id) {
      console.warn('Using preferred primary Google calendar for Meet event creation', {
        bookingId: booking.id,
        selectedCalendarId: calendar.calendarId,
        preferredCalendarId: preferredMeetCalendar.calendarId,
      });
      calendar = preferredMeetCalendar;
    }
  }

  let googleEvent = await createGoogleCalendarEventOnCalendar({
    calendar,
    booking,
    eventType,
    host,
    wantsGoogleMeet,
  });

  if (!googleEvent) {
    return null;
  }

  if (wantsGoogleMeet && !googleEvent.meetingUrl) {
    const fallbackCalendar = getGoogleMeetFallbackCalendar(booking.hostId, calendar);
    if (fallbackCalendar) {
      console.warn('Retrying Google Meet creation on fallback calendar', {
        bookingId: booking.id,
        originalCalendarId: calendar.calendarId,
        fallbackCalendarId: fallbackCalendar.calendarId,
      });

      const fallbackEvent = await createGoogleCalendarEventOnCalendar({
        calendar: fallbackCalendar,
        booking,
        eventType,
        host,
        wantsGoogleMeet,
      });

      if (fallbackEvent?.meetingUrl) {
        await deleteGoogleCalendarEventForBooking({
          userId: booking.hostId,
          eventId: googleEvent.eventId,
          connectedCalendarId: googleEvent.connectedCalendarId,
          calendarId: googleEvent.calendarId,
        }).catch((error) => {
          console.error('Failed to remove fallback Google Calendar event without Meet link', error);
        });

        googleEvent = fallbackEvent;
        calendar = fallbackCalendar;
      }
    }
  }

  await ensureGoogleCalendarWatches(booking.hostId).catch((error) => {
    console.error('Failed to ensure Google Calendar watch after event creation', error);
  });

  return {
    connectedCalendarId: googleEvent.connectedCalendarId,
    calendarId: googleEvent.calendarId,
    eventId: googleEvent.eventId,
    htmlLink: googleEvent.htmlLink,
    meetingUrl: googleEvent.meetingUrl,
  } as GoogleBookingEventResult;
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

export async function ensureGoogleCalendarEventForBooking(params: {
  booking: Booking;
  eventType: EventType;
  host: User;
}) {
  const { booking, eventType, host } = params;
  const wantsGoogleMeet = bookingWantsGoogleMeet(booking, eventType);
  const metadata = extractGoogleCalendarMetadata(booking.metadata);
  const eventId = metadata?.eventId || booking.calendarEventId;

  if (booking.status !== 'confirmed') {
    return booking;
  }

  if (new Date(booking.endTime).getTime() < Date.now()) {
    return booking;
  }

  if (!eventId) {
    const createdEvent = await createGoogleCalendarEventForBooking({ booking, eventType, host });
    if (!createdEvent) {
      return booking;
    }

    const updated = bookings().update(booking.id, {
      calendarEventId: createdEvent.eventId,
      meetingUrl: createdEvent.meetingUrl || booking.meetingUrl,
      locationValue: wantsGoogleMeet
        ? (createdEvent.meetingUrl || booking.locationValue || 'Google Meet')
        : booking.locationValue,
      metadata: JSON.stringify({
        ...parseBookingMetadata(booking.metadata),
        googleCalendar: {
          connectedCalendarId: createdEvent.connectedCalendarId,
          calendarId: createdEvent.calendarId,
          eventId: createdEvent.eventId,
          htmlLink: createdEvent.htmlLink || '',
        },
      }),
    }) as Booking | null;

    return updated || booking;
  }

  let calendars = getAllConnectedGoogleCalendars(booking.hostId);
  let calendar = calendars.find((item) => item.id === metadata?.connectedCalendarId)
    || calendars.find((item) => item.calendarId === metadata?.calendarId && item.addEventsTo)
    || calendars.find((item) => item.calendarId === metadata?.calendarId)
    || getGoogleAddToCalendar(booking.hostId);

  if (!calendar) {
    calendar = await recoverGoogleCalendarConnection(booking.hostId);
    calendars = getAllConnectedGoogleCalendars(booking.hostId);
    calendar = calendar
      || calendars.find((item) => item.id === metadata?.connectedCalendarId)
      || calendars.find((item) => item.calendarId === metadata?.calendarId)
      || null;
  }

  if (!calendar) {
    return booking;
  }

  let event = await fetchGoogleCalendarEvent(calendar, eventId);

  if (!event) {
    const recreated = await createGoogleCalendarEventForBooking({ booking, eventType, host });
    if (!recreated) {
      return booking;
    }

    const updated = bookings().update(booking.id, {
      calendarEventId: recreated.eventId,
      meetingUrl: recreated.meetingUrl || booking.meetingUrl,
      locationValue: wantsGoogleMeet
        ? (recreated.meetingUrl || booking.locationValue || 'Google Meet')
        : booking.locationValue,
      metadata: JSON.stringify({
        ...parseBookingMetadata(booking.metadata),
        googleCalendar: {
          connectedCalendarId: recreated.connectedCalendarId,
          calendarId: recreated.calendarId,
          eventId: recreated.eventId,
          htmlLink: recreated.htmlLink || '',
        },
      }),
    }) as Booking | null;

    return updated || booking;
  }

  let meetingUrl = extractGoogleMeetingUrl(event);
  if (wantsGoogleMeet && !meetingUrl) {
    const patchedEvent = await requestGoogleMeetConference(calendar, eventId);
    if (patchedEvent) {
      event = patchedEvent;
      meetingUrl = extractGoogleMeetingUrl(event);
    }

    if (!meetingUrl) {
      const awaited = await waitForGoogleMeetConference(calendar, eventId);
      if (awaited.latestEvent) {
        event = awaited.latestEvent;
        meetingUrl = awaited.meetingUrl || meetingUrl;
      }
    }
  }

  const updated = applyGoogleCalendarChangeToBooking(booking, calendar, event);
  return updated || booking;
}

function readGoogleWatchNotification(headers: Headers): GoogleWatchNotification | null {
  const channelId = headers.get('x-goog-channel-id') || '';
  if (!channelId) {
    return null;
  }

  return {
    channelId,
    channelToken: headers.get('x-goog-channel-token') || '',
    resourceId: headers.get('x-goog-resource-id') || '',
    resourceState: headers.get('x-goog-resource-state') || '',
    messageNumber: Number(headers.get('x-goog-message-number') || '0'),
  };
}

async function listChangedGoogleCalendarEvents(
  calendar: ConnectedGoogleCalendar,
  updatedMin: string,
) {
  const items: GoogleCalendarEvent[] = [];
  let pageToken = '';

  do {
    const response = await googleCalendarApiRequest(
      calendar,
      `/calendars/${encodeURIComponent(calendar.calendarId)}/events`,
      undefined,
      {
        updatedMin,
        showDeleted: 'true',
        singleEvents: 'true',
        maxResults: '250',
        pageToken: pageToken || undefined,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Calendar incremental sync failed', {
        calendarId: calendar.calendarId,
        status: response.status,
        errorText,
      });
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data?.items)) {
      items.push(...data.items);
    }

    pageToken = data?.nextPageToken || '';
  } while (pageToken);

  return items;
}

function extractGoogleEventDateTime(value?: GoogleCalendarEventDateTime) {
  if (!value?.dateTime) {
    return null;
  }

  return value.dateTime;
}

function buildGoogleCalendarMetadata(
  booking: Booking,
  calendar: ConnectedGoogleCalendar,
  event: GoogleCalendarEvent,
  syncedAt: string,
) {
  const existingMetadata = parseBookingMetadata(booking.metadata);
  const existingGoogleMetadata = extractGoogleCalendarMetadata(booking.metadata) || {
    connectedCalendarId: '',
    calendarId: '',
    eventId: '',
    htmlLink: '',
  };

  return JSON.stringify({
    ...existingMetadata,
    googleCalendar: {
      ...existingGoogleMetadata,
      connectedCalendarId: calendar.id,
      calendarId: calendar.calendarId,
      eventId: event.id || existingGoogleMetadata.eventId || booking.calendarEventId || '',
      htmlLink: event.htmlLink || existingGoogleMetadata.htmlLink || '',
      lastSyncedAt: syncedAt,
    },
  });
}

function buildBookingLookupMaps(userId: string) {
  const byId = new Map<string, Booking>();
  const byUid = new Map<string, Booking>();
  const byEventKey = new Map<string, Booking>();
  const now = Date.now();

  const hostBookings = bookings().findMany({ where: { hostId: userId } }) as Booking[];
  for (const booking of hostBookings) {
    if (booking.status !== 'confirmed') continue;
    if (new Date(booking.endTime).getTime() < now) continue;

    byId.set(booking.id, booking);
    byUid.set(booking.uid, booking);

    const googleMetadata = extractGoogleCalendarMetadata(booking.metadata);
    const eventKey = buildBookingEventKey(
      googleMetadata?.eventId || booking.calendarEventId,
      googleMetadata?.calendarId,
    );
    if (eventKey) {
      byEventKey.set(eventKey, booking);
    }
  }

  return {
    byId,
    byUid,
    byEventKey,
  };
}

function findBookingForGoogleEvent(
  event: GoogleCalendarEvent,
  calendar: ConnectedGoogleCalendar,
  lookups: ReturnType<typeof buildBookingLookupMaps>,
) {
  const bookingId = event.extendedProperties?.private?.kalendrBookingId;
  if (bookingId && lookups.byId.has(bookingId)) {
    return lookups.byId.get(bookingId) || null;
  }

  const bookingUid = event.extendedProperties?.private?.kalendrBookingUid;
  if (bookingUid && lookups.byUid.has(bookingUid)) {
    return lookups.byUid.get(bookingUid) || null;
  }

  const eventKey = buildBookingEventKey(event.id, calendar.calendarId);
  if (eventKey && lookups.byEventKey.has(eventKey)) {
    return lookups.byEventKey.get(eventKey) || null;
  }

  return null;
}

function applyGoogleCalendarChangeToBooking(
  booking: Booking,
  calendar: ConnectedGoogleCalendar,
  event: GoogleCalendarEvent,
) {
  const syncedAt = new Date().toISOString();
  const metadata = buildGoogleCalendarMetadata(booking, calendar, event, syncedAt);

  if (event.status === 'cancelled') {
    return bookings().update(booking.id, {
      status: 'cancelled',
      cancelReason: booking.cancelReason || 'Cancelled in Google Calendar',
      cancelledAt: booking.cancelledAt || event.updated || syncedAt,
      metadata,
    }) as Booking | null;
  }

  const nextStartTime = extractGoogleEventDateTime(event.start) || booking.startTime;
  const nextEndTime = extractGoogleEventDateTime(event.end) || booking.endTime;
  const nextTimezone = event.start?.timeZone || event.end?.timeZone || booking.timezone;
  const nextMeetingUrl = extractGoogleMeetingUrl(event) || booking.meetingUrl || null;
  const updates: Partial<Booking> & Record<string, any> = {
    startTime: nextStartTime,
    endTime: nextEndTime,
    timezone: nextTimezone,
    calendarEventId: event.id || booking.calendarEventId,
    meetingUrl: nextMeetingUrl || undefined,
    metadata,
  };

  if (booking.locationType === 'google_meet') {
    updates.locationValue = nextMeetingUrl || booking.locationValue || 'Google Meet';
  } else if (typeof event.location === 'string') {
    updates.locationValue = event.location;
  }

  return bookings().update(booking.id, updates) as Booking | null;
}

async function reconcileGoogleCalendarChanges(calendar: ConnectedGoogleCalendar) {
  const latestCalendar = normalizeGoogleCalendar(
    (connectedCalendars().findById(calendar.id) as RawConnectedGoogleCalendar) || calendar,
  );
  const updatedMin = latestCalendar.watchCursorUpdatedAt
    || new Date(Date.now() - GOOGLE_WATCH_CURSOR_LOOKBACK_MS).toISOString();
  const nextCursor = new Date().toISOString();
  const changedEvents = await listChangedGoogleCalendarEvents(latestCalendar, updatedMin);

  if (!changedEvents) {
    return 0;
  }

  const lookups = buildBookingLookupMaps(latestCalendar.userId);
  let updatedCount = 0;

  for (const event of changedEvents) {
    const booking = findBookingForGoogleEvent(event, latestCalendar, lookups);
    if (!booking) continue;

    const updatedBooking = applyGoogleCalendarChangeToBooking(booking, latestCalendar, event);
    if (!updatedBooking) continue;

    updatedCount += 1;
    lookups.byId.set(updatedBooking.id, updatedBooking);
    lookups.byUid.set(updatedBooking.uid, updatedBooking);

    const googleMetadata = extractGoogleCalendarMetadata(updatedBooking.metadata);
    const eventKey = buildBookingEventKey(
      googleMetadata?.eventId || updatedBooking.calendarEventId,
      googleMetadata?.calendarId || latestCalendar.calendarId,
    );
    if (eventKey) {
      lookups.byEventKey.set(eventKey, updatedBooking);
    }
  }

  connectedCalendars().update(latestCalendar.id, {
    watchCursorUpdatedAt: nextCursor,
    watchLastWebhookAt: new Date().toISOString(),
  });

  return updatedCount;
}

export async function handleGoogleCalendarWatchNotification(headers: Headers) {
  const notification = readGoogleWatchNotification(headers);
  if (!notification) {
    return false;
  }

  let calendar: ConnectedGoogleCalendar | null = null;

  if (notification.channelToken) {
    const params = new URLSearchParams(notification.channelToken);
    const calendarId = params.get('calendarId');
    if (calendarId) {
      const byToken = connectedCalendars().findById(calendarId) as RawConnectedGoogleCalendar | null;
      if (byToken?.provider === 'google') {
        const normalized = normalizeGoogleCalendar(byToken);
        if (hasValidGoogleWatchToken(normalized, notification.channelToken)) {
          calendar = normalized;
        }
      }
    }
  }

  if (!calendar) {
    const byChannel = connectedCalendars().findFirst({
      where: {
        provider: 'google',
        watchChannelId: notification.channelId,
      },
    }) as RawConnectedGoogleCalendar | null;
    if (byChannel) {
      calendar = normalizeGoogleCalendar(byChannel);
    }
  }

  if (!calendar) {
    return false;
  }

  if (calendar.watchChannelId && calendar.watchChannelId !== notification.channelId) {
    return false;
  }

  if (calendar.watchResourceId && notification.resourceId && calendar.watchResourceId !== notification.resourceId) {
    return false;
  }

  if (
    typeof calendar.watchLastMessageNumber === 'number'
    && notification.messageNumber > 0
    && notification.messageNumber <= calendar.watchLastMessageNumber
  ) {
    return true;
  }

  const updatedCalendar = connectedCalendars().update(calendar.id, {
    watchChannelId: notification.channelId,
    watchResourceId: notification.resourceId || calendar.watchResourceId || '',
    watchToken: notification.channelToken || calendar.watchToken || '',
    watchLastWebhookAt: new Date().toISOString(),
    watchLastMessageNumber: notification.messageNumber || calendar.watchLastMessageNumber || 0,
  }) as RawConnectedGoogleCalendar | null;

  const latestCalendar = normalizeGoogleCalendar(updatedCalendar || calendar);

  if (notification.resourceState === 'sync') {
    return true;
  }

  await reconcileGoogleCalendarChanges(latestCalendar);

  if (!isGoogleCalendarWatchFresh(latestCalendar)) {
    await ensureGoogleCalendarWatches(latestCalendar.userId);
  }

  return true;
}
