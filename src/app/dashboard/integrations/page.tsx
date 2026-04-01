'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import {
  GoogleCalendarIcon,
  MicrosoftOutlookIcon,
  ZoomIcon,
  GoogleMeetIcon,
  StripeIcon,
  SalesforceIcon,
  HubSpotIcon,
  SlackIcon,
} from '@/components/ui/brand-icons';

type ProviderConfig = {
  configured: boolean;
  missingEnvVars?: string[];
  comingSoon?: boolean;
  name: string;
};

type ConnectedIntegration = {
  id: string;
  provider: string;
  email?: string;
  displayName?: string;
  externalId?: string;
  teamName?: string;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
  lastSyncedAt?: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
};

type SlackChannel = {
  id: string;
  name: string;
};

const INTEGRATIONS = [
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Check conflicts across selected calendars and add bookings to one chosen Google calendar',
    Icon: GoogleCalendarIcon,
    category: 'Calendars',
    provider: 'google',
  },
  {
    id: 'microsoft',
    name: 'Microsoft Outlook',
    description: 'Connect your Outlook calendar for availability and events',
    Icon: MicrosoftOutlookIcon,
    category: 'Calendars',
    provider: 'microsoft',
  },
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Automatically generate Zoom meeting links',
    Icon: ZoomIcon,
    category: 'Video Conferencing',
    provider: 'zoom',
  },
  {
    id: 'google_meet',
    name: 'Google Meet',
    description: 'Use your Google add-to calendar to generate Meet links automatically',
    Icon: GoogleMeetIcon,
    category: 'Video Conferencing',
    provider: 'google_meet',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Connect your Stripe account for paid-booking setup',
    Icon: StripeIcon,
    category: 'Payments',
    provider: 'stripe',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Sync booking leads into Salesforce',
    Icon: SalesforceIcon,
    category: 'CRM',
    provider: 'salesforce',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Create or update HubSpot contacts from bookings',
    Icon: HubSpotIcon,
    category: 'CRM',
    provider: 'hubspot',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Post booking notifications into a Slack channel',
    Icon: SlackIcon,
    category: 'Notifications',
    provider: 'slack',
  },
];

const MANAGEABLE_PROVIDERS = new Set(['stripe', 'salesforce', 'hubspot', 'slack']);

export default function IntegrationsPage() {
  const [connectedCalendars, setConnectedCalendars] = useState<any[]>([]);
  const [connectedIntegrations, setConnectedIntegrations] = useState<ConnectedIntegration[]>([]);
  const [providerConfigs, setProviderConfigs] = useState<Record<string, ProviderConfig>>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [savingCalendarId, setSavingCalendarId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [manageProvider, setManageProvider] = useState<string | null>(null);
  const [manageIntegration, setManageIntegration] = useState<ConnectedIntegration | null>(null);
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
  const [selectedSlackChannelId, setSelectedSlackChannelId] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      setToast({ type: 'success', message: success.replace(/\+/g, ' ') });
      window.history.replaceState({}, '', '/dashboard/integrations');
    } else if (error) {
      setToast({ type: 'error', message: error.replace(/\+/g, ' ') });
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [calRes, statusRes] = await Promise.all([
        fetch('/api/integrations/calendars'),
        fetch('/api/integrations/status'),
      ]);

      const calData = await calRes.json().catch(() => ({ calendars: [] }));
      const statusData = await statusRes.json().catch(() => ({ integrations: [], providerConfigs: {} }));

      setConnectedCalendars(calData.calendars || []);
      setConnectedIntegrations(statusData.integrations || []);
      setProviderConfigs(statusData.providerConfigs || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const connectedByProvider = useMemo(() => {
    return Object.fromEntries(connectedIntegrations.map((integration) => [integration.provider, integration]));
  }, [connectedIntegrations]);

  const getProviderConfig = (provider: string) => providerConfigs[provider];

  const isConnected = (provider: string) => {
    if (provider === 'google_meet') {
      return connectedCalendars.some((calendar) => calendar.provider === 'google' && calendar.addEventsTo);
    }
    if (connectedCalendars.some((calendar) => calendar.provider === provider)) return true;
    return Boolean(connectedByProvider[provider]);
  };

  const getConnectionLabel = (provider: string) => {
    if (provider === 'google_meet') {
      const addToCalendar = connectedCalendars.find((calendar) => calendar.provider === 'google' && calendar.addEventsTo);
      return addToCalendar ? (addToCalendar.calendarName || addToCalendar.email) : '';
    }
    const integration = connectedByProvider[provider];
    if (!integration) return '';
    return (
      integration.teamName ||
      integration.displayName ||
      integration.email ||
      integration.externalId ||
      ''
    );
  };

  const handleConnect = async (provider: string) => {
    const config = getProviderConfig(provider);
    if (config?.comingSoon) {
      setToast({ type: 'error', message: `${config.name} is still being finished.` });
      return;
    }

    if (config && !config.configured) {
      const missing = (config.missingEnvVars || []).join(', ');
      setToast({
        type: 'error',
        message: missing
          ? `${config.name} needs server credentials before it can connect: ${missing}.`
          : `${config.name} is not configured yet.`,
      });
      return;
    }

    setConnecting(provider);

    try {
      const isCalendar = ['google', 'microsoft'].includes(provider);
      const endpoint = isCalendar ? '/api/integrations/calendars' : '/api/integrations/connect';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setToast({
        type: 'error',
        message: data.message || data.error || 'Failed to start the connection flow.',
      });
    } catch {
      setToast({ type: 'error', message: 'Failed to start connection. Please try again.' });
    } finally {
      setConnecting(null);
    }
  };

  const handleCalendarPreferenceChange = async (calendarId: string, patch: Record<string, boolean>) => {
    const previousCalendars = connectedCalendars;
    setSavingCalendarId(calendarId);

    setConnectedCalendars((current) => current.map((calendar) => {
      if (patch.addEventsTo === true && calendar.provider === 'google') {
        return { ...calendar, addEventsTo: calendar.id === calendarId };
      }

      if (calendar.id === calendarId) {
        return { ...calendar, ...patch };
      }

      return calendar;
    }));

    try {
      const response = await fetch('/api/integrations/calendars', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: calendarId, ...patch }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update calendar settings');
      }

      setConnectedCalendars((current) => current.map((calendar) => {
        if (patch.addEventsTo === true && calendar.provider === 'google') {
          return { ...calendar, addEventsTo: calendar.id === calendarId };
        }

        if (calendar.id === calendarId) {
          return { ...calendar, ...data.calendar };
        }

        return calendar;
      }));
    } catch (error: any) {
      setConnectedCalendars(previousCalendars);
      setToast({ type: 'error', message: error?.message || 'Unable to update calendar settings' });
    } finally {
      setSavingCalendarId(null);
    }
  };

  const openManageModal = async (provider: string) => {
    setManageProvider(provider);
    setSlackChannels([]);
    setSelectedSlackChannelId('');

    try {
      const response = await fetch(`/api/integrations/${provider}`);
      const data = await response.json();

      if (!response.ok) {
        setToast({ type: 'error', message: data.error || 'Failed to load integration details.' });
        setManageProvider(null);
        return;
      }

      setManageIntegration(data.integration || null);

      if (provider === 'slack') {
        setSlackChannels(data.channels || []);
        setSelectedSlackChannelId(data.integration?.settings?.defaultChannelId || '');
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to load integration details.' });
      setManageProvider(null);
    }
  };

  const closeManageModal = () => {
    setManageProvider(null);
    setManageIntegration(null);
    setSlackChannels([]);
    setSelectedSlackChannelId('');
    setSavingSettings(false);
    setDisconnecting(false);
  };

  const handleCardAction = async (provider: string) => {
    if (provider === 'google_meet') {
      setToast({
        type: 'success',
        message: isConnected('google_meet')
          ? 'Google Meet is available through your selected Google add-to calendar.'
          : 'Connect Google Calendar first, then choose one Google calendar to receive bookings and Meet links.',
      });
      return;
    }

    if (isConnected(provider) && MANAGEABLE_PROVIDERS.has(provider)) {
      await openManageModal(provider);
      return;
    }

    if (isConnected(provider)) {
      setToast({ type: 'success', message: `${INTEGRATIONS.find((item) => item.provider === provider)?.name || provider} is already connected.` });
      return;
    }

    await handleConnect(provider);
  };

  const handleSaveSlackSettings = async () => {
    if (!manageProvider || manageProvider !== 'slack' || !selectedSlackChannelId) return;

    const selectedChannel = slackChannels.find((channel) => channel.id === selectedSlackChannelId);
    if (!selectedChannel) return;

    setSavingSettings(true);
    try {
      const response = await fetch(`/api/integrations/${manageProvider}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultChannelId: selectedChannel.id,
          defaultChannelName: selectedChannel.name,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setToast({ type: 'error', message: data.error || 'Failed to save Slack settings.' });
        return;
      }

      setManageIntegration(data.integration || null);
      setToast({ type: 'success', message: 'Slack channel updated.' });
      await loadData();
    } catch {
      setToast({ type: 'error', message: 'Failed to save Slack settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDisconnect = async () => {
    if (!manageProvider) return;

    setDisconnecting(true);
    try {
      const response = await fetch(`/api/integrations/${manageProvider}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({ success: false }));

      if (!response.ok) {
        setToast({ type: 'error', message: data.error || 'Failed to disconnect integration.' });
        return;
      }

      setToast({ type: 'success', message: 'Integration disconnected.' });
      closeManageModal();
      await loadData();
    } catch {
      setToast({ type: 'error', message: 'Failed to disconnect integration.' });
    } finally {
      setDisconnecting(false);
    }
  };

  const categories = [...new Set(INTEGRATIONS.map((integration) => integration.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin-slow w-8 h-8 border-2 border-[#03b2d1] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1">Connect your tools to streamline scheduling workflows</p>
      </div>

      <Card className="border-[#03b2d1]/20 bg-cyan-50/60">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white border border-cyan-100 flex items-center justify-center flex-shrink-0">
            <GoogleCalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Google Calendar data use</h2>
            <p className="mt-1 text-sm text-gray-600">
              KalendR checks busy times on the Google calendars you select, creates booking events on the
              one Google calendar you choose as your add-to calendar, and can generate Google Meet links
              for bookings that use Google Meet.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <Link href="/privacy" className="text-[#03b2d1] hover:text-[#0292ab] font-medium">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-[#03b2d1] hover:text-[#0292ab] font-medium">
                Terms of Service
              </Link>
              <Link href="/data-deletion" className="text-[#03b2d1] hover:text-[#0292ab] font-medium">
                Data deletion
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {connectedCalendars.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Connected Calendars</h2>
          <p className="text-sm text-gray-500 mb-4">
            Use these settings the way Calendly does: pick the calendars that should block availability,
            then choose one Google calendar to receive booked events and Meet links.
          </p>
          <div className="space-y-3">
            {connectedCalendars.map((calendar) => (
              <div
                key={calendar.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900">{calendar.calendarName || calendar.email}</p>
                      <Badge variant="success">Connected</Badge>
                      {calendar.isPrimary && <Badge>Primary</Badge>}
                      {calendar.provider === 'google' && calendar.accessRole ? <Badge>{calendar.accessRole}</Badge> : null}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {calendar.provider === 'google'
                        ? `${calendar.accountEmail || calendar.email}${calendar.calendarId ? ` • ${calendar.calendarId}` : ''}`
                        : calendar.provider}
                    </p>

                    {calendar.provider === 'google' ? (
                      <div className="mt-3 flex flex-col gap-2 text-sm text-gray-700">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(calendar.checkForConflicts)}
                            disabled={savingCalendarId === calendar.id}
                            onChange={(event) => handleCalendarPreferenceChange(calendar.id, { checkForConflicts: event.target.checked })}
                          />
                          <span>Check this calendar for conflicts</span>
                        </label>
                        <label className={`inline-flex items-center gap-2 ${['owner', 'writer'].includes(calendar.accessRole || '') ? '' : 'text-gray-400'}`}>
                          <input
                            type="radio"
                            name="google-add-to-calendar"
                            checked={Boolean(calendar.addEventsTo)}
                            disabled={savingCalendarId === calendar.id || !['owner', 'writer'].includes(calendar.accessRole || '')}
                            onChange={() => handleCalendarPreferenceChange(calendar.id, { addEventsTo: true })}
                          />
                          <span>Add new bookings to this calendar</span>
                        </label>
                        {calendar.addEventsTo ? (
                          <p className="text-xs text-gray-500">
                            Google Meet bookings will use this calendar to create the meeting link.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {categories.map((category) => (
        <div key={category}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INTEGRATIONS.filter((integration) => integration.category === category).map((integration) => {
              const connected = isConnected(integration.provider);
              const providerConfig = getProviderConfig(integration.provider);
              const comingSoon = integration.provider === 'google_meet' ? false : Boolean(providerConfig?.comingSoon);
              const configured = integration.provider === 'google_meet'
                ? connectedCalendars.some((calendar) => calendar.provider === 'google')
                : providerConfig ? providerConfig.configured : true;
              const needsGoogleCalendar = integration.provider === 'google_meet' && !configured && !connected;
              const isLoading = connecting === integration.provider;
              const canManage = connected && MANAGEABLE_PROVIDERS.has(integration.provider);
              const disabled = isLoading || comingSoon || (!configured && !connected);
              const IconComponent = integration.Icon;
              const connectionLabel = getConnectionLabel(integration.provider);
              const syncStatus = connectedByProvider[integration.provider]?.lastSyncStatus;
              const syncError = connectedByProvider[integration.provider]?.lastSyncError;

              let buttonLabel = 'Connect';
              if (connected && canManage) buttonLabel = 'Manage';
              else if (connected) buttonLabel = integration.provider === 'google_meet' ? 'Included' : 'Connected';
              else if (comingSoon) buttonLabel = 'Coming soon';
              else if (!configured) buttonLabel = integration.provider === 'google_meet' ? 'Needs Google Calendar' : 'Setup required';

              return (
                <Card key={integration.id} className="hover:border-gray-300 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900">{integration.name}</h3>
                        {connected && <Badge variant="success">Connected</Badge>}
                        {!connected && comingSoon && <Badge>Coming soon</Badge>}
                        {!connected && needsGoogleCalendar && <Badge>Needs Google Calendar</Badge>}
                        {!connected && !comingSoon && !configured && !needsGoogleCalendar && <Badge>Setup required</Badge>}
                        {syncStatus === 'error' && <Badge>Needs attention</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{integration.description}</p>
                      {connectionLabel && (
                        <p className="text-xs text-gray-500 mt-2">Connected to {connectionLabel}</p>
                      )}
                      {!configured && !comingSoon && providerConfig?.missingEnvVars?.length ? (
                        <p className="text-xs text-amber-700 mt-2">
                          Missing server env: {providerConfig.missingEnvVars.join(', ')}
                        </p>
                      ) : null}
                      {syncStatus === 'error' && syncError ? (
                        <p className="text-xs text-red-600 mt-2">{syncError}</p>
                      ) : null}
                    </div>
                    <Button
                      variant={connected ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleCardAction(integration.provider)}
                      disabled={integration.provider === 'google_meet' ? false : disabled || (connected && !canManage)}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-1">
                          <span className="animate-spin-slow w-3 h-3 border border-current border-t-transparent rounded-full" />
                          Connecting...
                        </span>
                      ) : (
                        buttonLabel
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <Modal
        isOpen={Boolean(manageProvider && manageIntegration)}
        onClose={closeManageModal}
        title={manageIntegration ? `${INTEGRATIONS.find((item) => item.provider === manageProvider)?.name} Settings` : 'Integration Settings'}
      >
        {manageIntegration && (
          <div className="space-y-5">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">
                {manageIntegration.teamName || manageIntegration.displayName || manageIntegration.email || 'Connected'}
              </p>
              {manageIntegration.email ? (
                <p className="text-sm text-gray-500 mt-1">{manageIntegration.email}</p>
              ) : null}
              {manageIntegration.lastSyncedAt ? (
                <p className="text-xs text-gray-500 mt-2">
                  Last sync: {new Date(manageIntegration.lastSyncedAt).toLocaleString()}
                </p>
              ) : null}
            </div>

            {manageProvider === 'slack' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default notification channel
                </label>
                <select
                  value={selectedSlackChannelId}
                  onChange={(event) => setSelectedSlackChannelId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#03b2d1] focus:outline-none focus:ring-1 focus:ring-[#03b2d1]"
                >
                  <option value="">Select a channel</option>
                  {slackChannels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  New booking notifications will be sent to this channel.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting || savingSettings}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={closeManageModal} disabled={disconnecting || savingSettings}>
                  Close
                </Button>
                {manageProvider === 'slack' && (
                  <Button
                    onClick={handleSaveSlackSettings}
                    disabled={!selectedSlackChannelId || disconnecting || savingSettings}
                  >
                    {savingSettings ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
