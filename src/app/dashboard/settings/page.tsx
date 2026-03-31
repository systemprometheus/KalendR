'use client';
import { useState, useEffect } from 'react';
import { User, Globe, Link2, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TIMEZONES, formatTimezoneLabel } from '@/lib/timezones';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', timezone: '', bio: '', welcomeMessage: '' });

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.user) {
        setUser(data.user);
        setForm({
          name: data.user.name || '',
          slug: data.user.slug || '',
          timezone: data.user.timezone || 'America/New_York',
          bio: data.user.bio || '',
          welcomeMessage: data.user.welcomeMessage || '',
        });
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin-slow w-8 h-8 border-2 border-[#0069ff] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-500 mt-1">Manage your profile and preferences</p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-gray-400" /> Profile
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#0069ff] flex items-center justify-center text-white text-2xl font-bold">
              {form.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <Input label="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Bio" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Brief bio shown on your booking page" />
          <Input label="Welcome Message" value={form.welcomeMessage} onChange={e => setForm({ ...form, welcomeMessage: e.target.value })} placeholder="Shown to invitees on your booking page" />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-gray-400" /> Booking URL
        </h2>
        <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
          <span className="px-3 py-2 bg-gray-50 text-sm text-gray-500 border-r border-gray-300">kalendr.io/</span>
          <input
            type="text"
            value={form.slug}
            onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            className="flex-1 px-3 py-2 text-sm focus:outline-none"
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-400" /> Timezone
        </h2>
        <Select value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} options={TIMEZONES.map(tz => ({ value: tz.value, label: formatTimezoneLabel(tz) }))} />
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-600">Settings saved!</span>}
        <Button onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" /> Save Settings
        </Button>
      </div>
    </div>
  );
}
