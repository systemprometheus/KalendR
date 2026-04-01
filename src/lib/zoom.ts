import { db } from './db';

const integrations = () => db.collection<any>('integrations');

type ConnectedZoomIntegration = {
  id: string;
  userId: string;
  provider: 'zoom';
  email?: string;
  externalId?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: string;
};

type ZoomApiOptions = {
  method: 'POST' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
};

export type ZoomMeetingDetails = {
  meetingId: string;
  joinUrl: string;
  startUrl?: string;
  password?: string;
};

export function getZoomOAuthConfig() {
  const clientId = (process.env.ZOOM_CLIENT_ID || '').trim();
  const clientSecret = (process.env.ZOOM_CLIENT_SECRET || '').trim();
  const missing = [
    !clientId ? 'ZOOM_CLIENT_ID' : null,
    !clientSecret ? 'ZOOM_CLIENT_SECRET' : null,
  ].filter(Boolean) as string[];

  return {
    clientId,
    clientSecret,
    missing,
    configured: missing.length === 0,
  };
}

export function buildZoomOAuthUrl(baseUrl: string, clientId: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/integrations/zoom/callback`,
    response_type: 'code',
  });

  return `https://zoom.us/oauth/authorize?${params.toString()}`;
}

function getConnectedZoomIntegration(userId: string): ConnectedZoomIntegration | null {
  return integrations().findFirst({
    where: { userId, provider: 'zoom' },
  }) as ConnectedZoomIntegration | null;
}

function shouldRefreshToken(integration: ConnectedZoomIntegration) {
  if (!integration.tokenExpiry) return false;

  const expiryMs = new Date(integration.tokenExpiry).getTime();
  if (!Number.isFinite(expiryMs)) return false;

  return expiryMs <= Date.now() + 60_000;
}

async function refreshZoomAccessToken(integration: ConnectedZoomIntegration) {
  if (!integration.refreshToken) {
    return integration.accessToken;
  }

  const config = getZoomOAuthConfig();
  if (!config.configured) {
    return integration.accessToken;
  }

  const tokenRes = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refreshToken,
    }),
  });

  const refreshed = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !refreshed?.access_token) {
    console.error('Failed to refresh Zoom access token', {
      integrationId: integration.id,
      email: integration.email,
      status: tokenRes.status,
      error: refreshed,
    });
    return integration.accessToken;
  }

  integrations().update(integration.id, {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || integration.refreshToken,
    tokenExpiry: refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      : integration.tokenExpiry,
    externalId: refreshed.user_id || integration.externalId,
  });

  return refreshed.access_token as string;
}

async function getValidAccessToken(integration: ConnectedZoomIntegration) {
  if (!integration.accessToken || shouldRefreshToken(integration)) {
    return refreshZoomAccessToken(integration);
  }

  return integration.accessToken;
}

async function zoomApiRequest(
  integration: ConnectedZoomIntegration,
  url: string,
  options: ZoomApiOptions,
) {
  const execute = (accessToken: string) => fetch(url, {
    method: options.method,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
    body: options.body,
  });

  let accessToken = await getValidAccessToken(integration);
  let res = await execute(accessToken);

  if (res.status === 401 && integration.refreshToken) {
    accessToken = await refreshZoomAccessToken(integration);
    res = await execute(accessToken);
  }

  return res;
}

export async function createZoomMeeting(params: {
  userId: string;
  startTime: Date;
  durationMinutes: number;
  timezone: string;
  topic: string;
  agenda?: string;
}): Promise<ZoomMeetingDetails | null> {
  const integration = getConnectedZoomIntegration(params.userId);
  if (!integration) {
    return null;
  }

  try {
    const res = await zoomApiRequest(integration, 'https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: params.topic,
        agenda: params.agenda,
        type: 2,
        start_time: params.startTime.toISOString(),
        duration: params.durationMinutes,
        timezone: params.timezone,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          waiting_room: true,
        },
      }),
    });

    const meeting = await res.json().catch(() => null);
    if (!res.ok || !meeting?.join_url) {
      console.error('Zoom meeting creation failed', {
        userId: params.userId,
        integrationId: integration.id,
        status: res.status,
        error: meeting,
      });
      return null;
    }

    return {
      meetingId: String(meeting.id || ''),
      joinUrl: String(meeting.join_url),
      startUrl: meeting.start_url ? String(meeting.start_url) : undefined,
      password: meeting.password ? String(meeting.password) : undefined,
    };
  } catch (error) {
    console.error('Zoom meeting creation error', {
      userId: params.userId,
      error,
    });
    return null;
  }
}

export async function deleteZoomMeeting(params: {
  userId: string;
  meetingId: string;
}) {
  if (!params.meetingId) {
    return false;
  }

  const integration = getConnectedZoomIntegration(params.userId);
  if (!integration) {
    return false;
  }

  try {
    const res = await zoomApiRequest(
      integration,
      `https://api.zoom.us/v2/meetings/${encodeURIComponent(params.meetingId)}`,
      { method: 'DELETE' },
    );

    if (res.ok || res.status === 204 || res.status === 404) {
      return true;
    }

    const errorText = await res.text();
    console.error('Zoom meeting deletion failed', {
      userId: params.userId,
      integrationId: integration.id,
      meetingId: params.meetingId,
      status: res.status,
      errorText,
    });
    return false;
  } catch (error) {
    console.error('Zoom meeting deletion error', {
      userId: params.userId,
      meetingId: params.meetingId,
      error,
    });
    return false;
  }
}
