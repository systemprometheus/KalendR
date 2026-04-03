'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GoogleCalendarIcon, MicrosoftOutlookIcon, ZoomIcon, GoogleMeetIcon,
  StripeIcon, SalesforceIcon, HubSpotIcon, SlackIcon
} from '@/components/ui/brand-icons';

const INTEGRATIONS = [
  { id: 'google', name: 'Google Calendar', description: 'Sync events, check availability, and add new meetings', Icon: GoogleCalendarIcon, category: 'Calendars', provider: 'google' },
  { id: 'microsoft', name: 'Microsoft Outlook', description: 'Connect your Outlook calendar for availability and events', Icon: MicrosoftOutlookIcon, category: 'Calendars', provider: 'microsoft' },
  { id: 'zoom', name: 'Zoom', description: 'Automatically generate Zoom meeting links', Icon: ZoomIcon, category: 'Video Conferencing', provider: 'zoom' },
  { id: 'google_meet', name: 'Google Meet', description: 'Create Google Meet links for virtual meetings', Icon: GoogleMeetIcon, category: 'Video Conferencing', provider: 'google_meet' },
  { id: 'stripe', name: 'Stripe', description: 'Collect payments when meetings are booked', Icon: StripeIcon, category: 'Payments', provider: 'stripe' },
  { id: 'salesforce', name: 'Salesforce', description: 'Sync booking data with your CRM', Icon: SalesforceIcon, category: 'CRM', provider: 'salesforce' },
  { id: 'hubspot', name: 'HubSpot', description: 'Connect booking data with HubSpot contacts', Icon: HubSpotIcon, category: 'CRM', provider: 'hubspot' },
  { id: 'slack', name: 'Slack', description: 'Get booking notifications in Slack channels', Icon: SlackIcon, category: 'Notifications', provider: 'slack' },
];

export default function IntegrationsPage() {
  const [connectedCalendars, setConnectedCalendars] = useState<any[]>([]);
  const [connectedIntegrations, setConnectedIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for success/error in URL params (from OAuth callback redirects)
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    if (success) {
      setToast({ type: 'success', message: success.replace(/\+/g, ' ') });
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/integrations');
    } else if (error) {
      setToast({ type: 'error', message: error.replace(/\+/g, ' ') });
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
  }, [searchParams]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    Promise.all([
      fetch('/api/integrations/calendars').then(r => r.json()),
      fetch('/api/integrations/status').then(r => r.json()).catch(() => ({ integrations: [] })),
    ]).then(([calData, intData]) => {
      setConnectedCalendars(calData.calendars || []);
      setConnectedIntegrations(intData.integrations || []);
      setLoading(false);
    });
  }, []);

  const hasGoogleBookingCalendar = connectedCalendars.some((calendar: any) => (
    calendar.provider === 'google' && calendar.addEventsTo
  ));

  const handleConnect = async (provider: string) => {
    const resolvedProvider = provider === 'google_meet' ? 'google' : provider;
    setConnecting(provider);
    try {
      // Calendar providers use the calendars endpoint, others use the connect endpoint
      const isCalendar = ['google', 'microsoft'].includes(resolvedProvider);
      const endpoint = isCalendar ? '/api/integrations/calendars' : '/api/integrations/connect';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: resolvedProvider }),
      });

      const data = await res.json();

      if (data.url) {
        // Open OAuth flow in same window for better UX
        window.location.href = data.url;
      } else if (data.stubbed) {
        setToast({
          type: 'error',
          message: `${data.error || provider + ' integration not configured'}. Contact the admin to set up credentials.`,
        });
      } else if (data.error) {
        setToast({ type: 'error', message: data.error });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to start connection. Please try again.' });
    } finally {
      setConnecting(null);
    }
  };

  const isConnected = (provider: string) => {
    if (provider === 'google_meet') return hasGoogleBookingCalendar;
    // Check calendars for google/microsoft
    if (connectedCalendars.some(c => c.provider === provider)) return true;
    // Check general integrations for others
    if (connectedIntegrations.some((i: any) => i.provider === provider)) return true;
    return false;
  };

  const categories = [...new Set(INTEGRATIONS.map(i => i.category))];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin-slow w-8 h-8 border-2 border-[#03b2d1] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">&times;</button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1">Connect your tools to streamline scheduling workflows</p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900">Google Calendar data use</h2>
        <p className="mt-2 text-sm leading-7 text-gray-600">
          KalendR uses Google Calendar data only to list your calendars, check busy times for conflict
          detection, create and delete booking events on your connected booking calendar, generate Google
          Meet links when selected, and keep KalendR bookings synced with Google-side changes.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="text-[#03b2d1] hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="text-[#03b2d1] hover:underline">Terms</Link>
          <Link href="/data-deletion" className="text-[#03b2d1] hover:underline">Data deletion</Link>
        </div>
      </Card>

      {connectedCalendars.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Calendars</h2>
          <div className="space-y-3">
            {connectedCalendars.map(cal => (
                <div key={cal.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{cal.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm text-gray-500 capitalize">{cal.provider}</p>
                      {cal.addEventsTo && <Badge>Booking calendar</Badge>}
                    </div>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>
            ))}
          </div>
        </Card>
      )}

      {categories.map(category => (
        <div key={category}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INTEGRATIONS.filter(i => i.category === category).map(integration => {
              const connected = isConnected(integration.provider);
              const isLoading = connecting === integration.provider;
              const IconComponent = integration.Icon;
              return (
                <Card key={integration.id} className="hover:border-gray-300 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{integration.name}</h3>
                        {connected && <Badge variant="success">Connected</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{integration.description}</p>
                    </div>
                    <Button
                      variant={connected ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleConnect(integration.provider)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-1">
                          <span className="animate-spin-slow w-3 h-3 border border-current border-t-transparent rounded-full" />
                          Connecting...
                        </span>
                      ) : connected ? 'Manage' : 'Connect'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
