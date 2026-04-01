'use client';
import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { TIMEZONES, formatTimezoneLabel } from '@/lib/timezones';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [timezone, setTimezone] = useState('America/New_York');
  const [scheduleName, setScheduleName] = useState('');

  const loadSchedules = async () => {
    const res = await fetch('/api/availability');
    const data = await res.json();
    setSchedules(data.schedules || []);
    if (data.schedules?.length > 0) {
      const def = data.schedules.find((s: any) => s.isDefault) || data.schedules[0];
      setActiveSchedule(def);
      setRules(def.rules || []);
      setTimezone(def.timezone);
      setScheduleName(def.name);
    }
    setLoading(false);
  };

  useEffect(() => { loadSchedules(); }, []);

  const toggleDay = (dayOfWeek: number) => {
    const existing = rules.find(r => r.dayOfWeek === dayOfWeek);
    if (existing) {
      if (existing.isEnabled) {
        setRules(rules.map(r => r.dayOfWeek === dayOfWeek ? { ...r, isEnabled: false } : r));
      } else {
        setRules(rules.map(r => r.dayOfWeek === dayOfWeek ? { ...r, isEnabled: true } : r));
      }
    } else {
      setRules([...rules, { dayOfWeek, startTime: '09:00', endTime: '17:00', isEnabled: true }]);
    }
  };

  const updateRule = (dayOfWeek: number, field: string, value: string) => {
    setRules(rules.map(r => r.dayOfWeek === dayOfWeek ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    if (!activeSchedule) return;
    setSaving(true);

    await fetch(`/api/availability/${activeSchedule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: scheduleName,
        timezone,
        rules: rules.filter(r => r.isEnabled).map(r => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          isEnabled: true,
        })),
      }),
    });

    setSaving(false);
    loadSchedules();
  };

  const handleCreateSchedule = async () => {
    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Schedule' }),
    });
    if (res.ok) loadSchedules();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin-slow w-8 h-8 border-2 border-[#03b2d1] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Availability</h1>
          <p className="text-gray-500 mt-1">Set when you're available for bookings</p>
        </div>
        <Button variant="outline" onClick={handleCreateSchedule}>
          <Plus className="w-4 h-4" /> New Schedule
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Schedule list */}
        <div className="space-y-2">
          {schedules.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setActiveSchedule(s);
                setRules(s.rules || []);
                setTimezone(s.timezone);
                setScheduleName(s.name);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                activeSchedule?.id === s.id
                  ? 'border-[#03b2d1] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-sm text-gray-900">{s.name}</span>
              </div>
              {s.isDefault && <Badge variant="info" className="mt-1">Default</Badge>}
            </button>
          ))}
        </div>

        {/* Schedule editor */}
        <div className="lg:col-span-3">
          {activeSchedule ? (
            <Card>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Schedule Name" value={scheduleName} onChange={e => setScheduleName(e.target.value)} />
                  <Select label="Timezone" value={timezone} onChange={e => setTimezone(e.target.value)} options={TIMEZONES.map(tz => ({ value: tz.value, label: formatTimezoneLabel(tz) }))} />
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Weekly Hours</h3>
                  <div className="space-y-3">
                    {DAYS.map((day, i) => {
                      const rule = rules.find(r => r.dayOfWeek === i);
                      const isEnabled = rule?.isEnabled ?? false;

                      return (
                        <div key={day} className="flex items-center gap-4">
                          <button
                            onClick={() => toggleDay(i)}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              isEnabled ? 'bg-[#03b2d1] border-[#03b2d1]' : 'border-gray-300'
                            }`}
                          >
                            {isEnabled && <Check className="w-3 h-3 text-white" />}
                          </button>
                          <span className={`w-24 text-sm ${isEnabled ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                            {day}
                          </span>
                          {isEnabled ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={rule?.startTime || '09:00'}
                                onChange={e => updateRule(i, 'startTime', e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <span className="text-gray-400">-</span>
                              <input
                                type="time"
                                value={rule?.endTime || '17:00'}
                                onChange={e => updateRule(i, 'endTime', e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Unavailable</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <Button onClick={handleSave} loading={saving}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-center text-gray-500 py-8">Select a schedule to edit</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
