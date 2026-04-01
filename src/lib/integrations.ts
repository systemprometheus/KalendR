import { format } from 'date-fns';
import { generateToken, verifyToken } from './auth';
import { integrations } from './db';
import type { Booking, EventType, Integration, User } from './types';

export type SupportedIntegrationProvider =
  | 'google'
  | 'microsoft'
  | 'zoom'
  | 'google_meet'
  | 'stripe'
  | 'salesforce'
  | 'hubspot'
  | 'slack';

type IntegrationStatePayload = {
  type: 'integration_oauth';
  provider: SupportedIntegrationProvider;
  userId: string;
};

type ProviderConfig = {
  name: string;
  envVars: string[];
  comingSoon?: boolean;
};

type SlackChannel = {
  id: string;
  name: string;
};

const PROVIDER_CONFIGS: Record<SupportedIntegrationProvider, ProviderConfig> = {
  google: {
    name: 'Google Calendar',
    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  },
  microsoft: {
    name: 'Microsoft Outlook',
    envVars: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
  },
  zoom: {
    name: 'Zoom',
    envVars: ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
  },
  google_meet: {
    name: 'Google Meet',
    envVars: [],
    comingSoon: true,
  },
  stripe: {
    name: 'Stripe',
    envVars: ['STRIPE_CLIENT_ID', 'STRIPE_SECRET_KEY'],
  },
  salesforce: {
    name: 'Salesforce',
    envVars: ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET'],
  },
  hubspot: {
    name: 'HubSpot',
    envVars: ['HUBSPOT_CLIENT_ID', 'HUBSPOT_CLIENT_SECRET'],
  },
  slack: {
    name: 'Slack',
    envVars: ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET'],
  },
};

const HUBSPOT_TOKEN_ENDPOINT = 'https://api.hubspot.com/oauth/2026-03/token';
const SALESFORCE_TOKEN_ENDPOINT = 'https://login.salesforce.com/services/oauth2/token';
const SALESFORCE_API_VERSION = 'v61.0';

export function getIntegrationProviderConfigs() {
  return Object.fromEntries(
    Object.entries(PROVIDER_CONFIGS).map(([provider, config]) => {
      const missingEnvVars = config.envVars.filter((key) => !process.env[key]);
      return [
        provider,
        {
          name: config.name,
          configured: !config.comingSoon && missingEnvVars.length === 0,
          missingEnvVars,
          comingSoon: Boolean(config.comingSoon),
        },
      ];
    }),
  );
}

export function getAppUrl(req?: Request) {
  const configured = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  if (req) return new URL(req.url).origin;
  return 'http://localhost:3000';
}

export function buildIntegrationState(userId: string, provider: SupportedIntegrationProvider) {
  return generateToken(
    {
      type: 'integration_oauth',
      provider,
      userId,
    },
    '15m',
  );
}

export function isValidIntegrationState(
  state: string | null,
  provider: SupportedIntegrationProvider,
  userId: string,
) {
  if (!state) return false;
  const payload = verifyToken(state) as Partial<IntegrationStatePayload> | null;
  if (!payload) return false;
  return payload.type === 'integration_oauth' && payload.provider === provider && payload.userId === userId;
}

export function getActiveIntegration(userId: string, provider: string) {
  return integrations().findFirst({
    where: {
      userId,
      provider,
      active: { not: false },
    },
  }) as Integration | null;
}

export function listActiveIntegrations(userId: string) {
  return integrations().findMany({
    where: {
      userId,
      active: { not: false },
    },
  }) as Integration[];
}

export function sanitizeIntegration(integration: Integration) {
  return {
    id: integration.id,
    provider: integration.provider,
    email: integration.email || '',
    displayName: integration.displayName || '',
    externalId: integration.externalId || '',
    teamName: integration.teamName || '',
    instanceUrl: integration.instanceUrl || '',
    scope: integration.scope || '',
    settings: integration.settings || {},
    metadata: integration.metadata || {},
    lastSyncedAt: integration.lastSyncedAt || '',
    lastSyncStatus: integration.lastSyncStatus || '',
    lastSyncError: integration.lastSyncError || '',
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
  };
}

export function upsertIntegration(userId: string, provider: string, data: Partial<Integration>) {
  const existing = integrations().findFirst({ where: { userId, provider } }) as Integration | null;

  if (existing) {
    return integrations().update(existing.id, {
      ...data,
      active: true,
      disconnectedAt: null,
    }) as Integration;
  }

  return integrations().create({
    userId,
    provider,
    active: true,
    ...data,
  }) as Integration;
}

export function disconnectIntegration(integrationId: string) {
  return integrations().update(integrationId, {
    active: false,
    disconnectedAt: new Date().toISOString(),
  });
}

function normalizeScope(scope: string | string[] | undefined) {
  if (!scope) return '';
  return Array.isArray(scope) ? scope.join(' ') : scope;
}

function shouldRefreshToken(tokenExpiry?: string) {
  if (!tokenExpiry) return false;
  return new Date(tokenExpiry).getTime() <= Date.now() + 60_000;
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function refreshHubSpotAccessToken(integration: Integration) {
  if (!integration.refreshToken || !process.env.HUBSPOT_CLIENT_ID || !process.env.HUBSPOT_CLIENT_SECRET) {
    return integration;
  }

  const response = await fetch(HUBSPOT_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refreshToken,
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
    }),
  });

  const data = await parseJson(response);
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.message || data?.error || 'Failed to refresh HubSpot access token');
  }

  return integrations().update(integration.id, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || integration.refreshToken,
    tokenExpiry: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : '',
    scope: normalizeScope(data.scopes || data.scope),
  }) as Integration;
}

async function refreshSalesforceAccessToken(integration: Integration) {
  if (!integration.refreshToken || !process.env.SALESFORCE_CLIENT_ID || !process.env.SALESFORCE_CLIENT_SECRET) {
    return integration;
  }

  const response = await fetch(SALESFORCE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refreshToken,
      client_id: process.env.SALESFORCE_CLIENT_ID,
      client_secret: process.env.SALESFORCE_CLIENT_SECRET,
    }),
  });

  const data = await parseJson(response);
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || 'Failed to refresh Salesforce access token');
  }

  return integrations().update(integration.id, {
    accessToken: data.access_token,
    instanceUrl: data.instance_url || integration.instanceUrl || '',
    tokenExpiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }) as Integration;
}

export async function getUsableIntegration(integration: Integration, forceRefresh = false) {
  if (!forceRefresh && !shouldRefreshToken(integration.tokenExpiry)) {
    return integration;
  }

  if (integration.provider === 'hubspot') {
    return refreshHubSpotAccessToken(integration);
  }

  if (integration.provider === 'salesforce') {
    return refreshSalesforceAccessToken(integration);
  }

  return integration;
}

async function providerFetch(
  integration: Integration,
  url: string,
  init: RequestInit = {},
  retryOnUnauthorized = true,
) {
  let usableIntegration = await getUsableIntegration(integration);
  let response = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${usableIntegration.accessToken}`,
    },
  });

  if (response.status === 401 && retryOnUnauthorized && usableIntegration.refreshToken) {
    usableIntegration = await getUsableIntegration(usableIntegration, true);
    response = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${usableIntegration.accessToken}`,
      },
    });
  }

  return {
    integration: usableIntegration,
    response,
  };
}

function splitName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { firstName: '', lastName: 'Guest' };

  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(' ') || firstName,
  };
}

function buildBookingSummary(booking: Booking, eventType: EventType, host: User, action: 'created' | 'cancelled') {
  const prefix = action === 'created' ? 'Booked' : 'Cancelled';
  return [
    `${prefix} via KalendR`,
    `Event: ${eventType.title}`,
    `Host: ${host.name}`,
    `Start: ${format(new Date(booking.startTime), 'PPpp')}`,
    `Timezone: ${booking.timezone}`,
    `Location: ${booking.locationValue || booking.locationType || 'TBD'}`,
    booking.inviteeNotes ? `Notes: ${booking.inviteeNotes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildSlackMessage(booking: Booking, eventType: EventType, host: User, action: 'created' | 'cancelled') {
  const heading = action === 'created' ? 'New booking confirmed' : 'Booking cancelled';
  return [
    `*${heading}*`,
    `*Event:* ${eventType.title}`,
    `*Invitee:* ${booking.inviteeName} (${booking.inviteeEmail})`,
    `*Host:* ${host.name}`,
    `*When:* ${format(new Date(booking.startTime), 'PPpp')} (${booking.timezone})`,
    `*Location:* ${booking.locationValue || booking.locationType || 'TBD'}`,
    booking.inviteeCompany ? `*Company:* ${booking.inviteeCompany}` : null,
    booking.inviteeNotes ? `*Notes:* ${booking.inviteeNotes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function escapeSoql(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function updateSyncStatus(integration: Integration, update: Partial<Integration>) {
  integrations().update(integration.id, update);
}

export async function fetchSlackChannels(accessToken: string) {
  const url = new URL('https://slack.com/api/conversations.list');
  url.searchParams.set('types', 'public_channel');
  url.searchParams.set('exclude_archived', 'true');
  url.searchParams.set('limit', '200');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await parseJson(response);

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || 'Unable to load Slack channels');
  }

  return (data.channels || []).map((channel: any) => ({
    id: channel.id,
    name: channel.name,
  })) as SlackChannel[];
}

function pickDefaultSlackChannel(channels: SlackChannel[]) {
  return channels.find((channel) => channel.name === 'general') || channels[0] || null;
}

async function syncHubSpotContact(integration: Integration, booking: Booking) {
  const { firstName, lastName } = splitName(booking.inviteeName);
  const properties = {
    email: booking.inviteeEmail,
    firstname: firstName || undefined,
    lastname: lastName || undefined,
    phone: booking.inviteePhone || undefined,
    company: booking.inviteeCompany || undefined,
    jobtitle: booking.inviteeJobTitle || undefined,
  };

  const { response: searchResponse } = await providerFetch(
    integration,
    'https://api.hubapi.com/crm/v3/objects/contacts/search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: booking.inviteeEmail,
              },
            ],
          },
        ],
        limit: 1,
      }),
    },
  );
  const searchData = await parseJson(searchResponse);

  if (!searchResponse.ok) {
    throw new Error(searchData?.message || searchData?.error || 'HubSpot contact lookup failed');
  }

  const existingContactId = searchData?.results?.[0]?.id;
  const contactUrl = existingContactId
    ? `https://api.hubapi.com/crm/v3/objects/contacts/${existingContactId}`
    : 'https://api.hubapi.com/crm/v3/objects/contacts';

  const { response: contactResponse } = await providerFetch(
    integration,
    contactUrl,
    {
      method: existingContactId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties }),
    },
  );
  const contactData = await parseJson(contactResponse);

  if (!contactResponse.ok) {
    throw new Error(contactData?.message || contactData?.error || 'HubSpot contact sync failed');
  }

  updateSyncStatus(integration, {
    lastSyncedAt: new Date().toISOString(),
    lastSyncStatus: 'success',
    lastSyncError: '',
    metadata: {
      ...(integration.metadata || {}),
      lastContactId: contactData?.id || existingContactId || '',
      lastContactEmail: booking.inviteeEmail,
    },
  });
}

async function syncSalesforceLead(
  integration: Integration,
  booking: Booking,
  eventType: EventType,
  host: User,
  action: 'created' | 'cancelled',
) {
  if (!integration.instanceUrl) {
    throw new Error('Salesforce instance URL is missing');
  }

  const { firstName, lastName } = splitName(booking.inviteeName);
  const query = `SELECT Id FROM Lead WHERE Email = '${escapeSoql(booking.inviteeEmail)}' LIMIT 1`;
  const queryUrl = `${integration.instanceUrl}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(query)}`;
  const { response: queryResponse } = await providerFetch(integration, queryUrl);
  const queryData = await parseJson(queryResponse);

  if (!queryResponse.ok) {
    throw new Error(queryData?.[0]?.message || queryData?.message || 'Salesforce lead lookup failed');
  }

  const leadId = queryData?.records?.[0]?.Id;
  const payload = {
    FirstName: firstName || undefined,
    LastName: lastName || 'Guest',
    Company: booking.inviteeCompany || 'Individual',
    Email: booking.inviteeEmail,
    Phone: booking.inviteePhone || undefined,
    Title: booking.inviteeJobTitle || undefined,
    LeadSource: 'KalendR',
    Description: buildBookingSummary(booking, eventType, host, action),
  };

  const leadUrl = leadId
    ? `${integration.instanceUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/Lead/${leadId}`
    : `${integration.instanceUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/Lead`;

  const { response: leadResponse } = await providerFetch(
    integration,
    leadUrl,
    {
      method: leadId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const leadData = await parseJson(leadResponse);

  if (!leadResponse.ok) {
    throw new Error(leadData?.[0]?.message || leadData?.message || 'Salesforce lead sync failed');
  }

  updateSyncStatus(integration, {
    lastSyncedAt: new Date().toISOString(),
    lastSyncStatus: 'success',
    lastSyncError: '',
    metadata: {
      ...(integration.metadata || {}),
      lastLeadId: leadId || leadData?.id || '',
      lastLeadEmail: booking.inviteeEmail,
    },
  });
}

async function syncSlackNotification(
  integration: Integration,
  booking: Booking,
  eventType: EventType,
  host: User,
  action: 'created' | 'cancelled',
) {
  let channelId = integration.settings?.defaultChannelId as string | undefined;
  let channelName = integration.settings?.defaultChannelName as string | undefined;

  if (!channelId) {
    const channels = await fetchSlackChannels(integration.accessToken);
    const fallbackChannel = pickDefaultSlackChannel(channels);

    if (!fallbackChannel) {
      throw new Error('No public Slack channels were found for this workspace');
    }

    channelId = fallbackChannel.id;
    channelName = fallbackChannel.name;
    integrations().update(integration.id, {
      settings: {
        ...(integration.settings || {}),
        defaultChannelId: channelId,
        defaultChannelName: channelName,
      },
    });
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelId,
      text: buildSlackMessage(booking, eventType, host, action),
      mrkdwn: true,
    }),
  });
  const data = await parseJson(response);

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || 'Slack notification failed');
  }

  updateSyncStatus(integration, {
    lastSyncedAt: new Date().toISOString(),
    lastSyncStatus: 'success',
    lastSyncError: '',
    settings: {
      ...(integration.settings || {}),
      defaultChannelId: channelId,
      defaultChannelName: channelName,
    },
    metadata: {
      ...(integration.metadata || {}),
      lastMessageTs: data.ts || '',
    },
  });
}

export async function syncConnectedIntegrations({
  userId,
  booking,
  eventType,
  host,
  action,
}: {
  userId: string;
  booking: Booking;
  eventType: EventType;
  host: User;
  action: 'created' | 'cancelled';
}) {
  const connected = listActiveIntegrations(userId).filter((integration) =>
    ['hubspot', 'salesforce', 'slack'].includes(integration.provider),
  );

  await Promise.allSettled(
    connected.map(async (integration) => {
      try {
        const usableIntegration = await getUsableIntegration(integration);

        if (usableIntegration.provider === 'hubspot' && action === 'created') {
          await syncHubSpotContact(usableIntegration, booking);
          return;
        }

        if (usableIntegration.provider === 'salesforce') {
          await syncSalesforceLead(usableIntegration, booking, eventType, host, action);
          return;
        }

        if (usableIntegration.provider === 'slack') {
          await syncSlackNotification(usableIntegration, booking, eventType, host, action);
        }
      } catch (error: any) {
        console.error(`${integration.provider} integration sync failed:`, error);
        updateSyncStatus(integration, {
          lastSyncStatus: 'error',
          lastSyncError: error?.message || 'Sync failed',
        });
      }
    }),
  );
}
