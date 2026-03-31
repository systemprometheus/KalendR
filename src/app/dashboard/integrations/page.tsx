'use client';
import { useState, useEffect } from 'react';
import { Link2, Calendar, Video, Mail, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const INTEGRATIONS = [
  { id: 'google', name: 'Google Calendar', description: 'Sync events, check availability, and add new meetings', icon: '📅', category: 'Calendars', provider: 'google' },
  { id: 'microsoft', name: 'Microsoft Outlook', description: 'Connect your Outlook calendar for availability and events', icon: '📧', category: 'Calendars', provider: 'microsoft' },
  { id: 'zoom', name: 'Zoom', description: 'Automatically generate Zoom meeting links', icon: '🎥', category: 'Video Conferencing', provider: 'zoom' },
  { id: 'google_meet', name: 'Google Meet', description: 'Create Google Meet links for virtual meetings', icon: '📹', category: 'Video Conferencing', provider: 'google_meet' },
  { id: 'stripe', name: 'Stripe', description: 'Collect payments when meetings are booked', icon: '💳', category: 'Payments', provider: 'stripe' },
  { id: 'salesforce', name: 'Salesforce', description: 'Sync booking data with your CRM', icon: '☁️', category: 'CRM', provider: 'salesforce' },
  { id: 'hubspot', name: 'HubSpot', description: 'Connect booking data with HubSpot contacts', icon: '🟠', category: 'CRM', provider: 'hubspot' },
  { id: 'slack', name: 'Slack', description: 'Get booking notifications in Slack channels', icon: '💬', category: 'Notifications', provider: 'slack' },
];

export default function IntegrationsPage() {
  const [connectedCalendars, setConnectedCalendars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/integrations/calendars').then(r => r.json()).then(data => {
      setConnectedCalendars(data.calendars || []);
      setLoading(false);
    });
  }, []);

  const handleConnect = async (provider: string) => {
    const res = await fetch('/api/integrations/calendars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    const data = await res.json();
    if (data.url) {
      window.open(data.url, '_blank');
    } else if (data.stubbed) {
      alert(`${provider} integration requires OAuth credentials. Set the environment variables and try again.`);
    }
  };

  const isConnected = (provider: string) => connectedCalendars.some(c => c.provider === provider);

  const categories = [...new Set(INTEGRATIONS.map(i => i.category))];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin-slow w-8 h-8 border-2 border-[#0069ff] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-1">Connect your tools to streamline scheduling workflows</p>
      </div>

      {connectedCalendars.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Calendars</h2>
          <div className="space-y-3">
            {connectedCalendars.map(cal => (
              <div key={cal.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{cal.email}</p>
                  <p className="text-sm text-gray-500 capitalize">{cal.provider}</p>
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
              return (
                <Card key={integration.id} className="hover:border-gray-300 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{integration.icon}</div>
                    <div className="flex-1">
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
                    >
                      {connected ? 'Manage' : 'Connect'}
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
