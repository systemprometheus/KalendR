'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Copy, ExternalLink, MoreVertical, Pencil, Trash2, ToggleLeft, ToggleRight, LayoutGrid, Users, RefreshCw, UserCheck, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';

const EVENT_COLORS = ['#0069ff', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];
const LOCATION_TYPES = [
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'in_person', label: 'In Person' },
  { value: 'custom', label: 'Custom' },
  { value: 'ask_invitee', label: 'Ask Invitee' },
];
const EVENT_KINDS = [
  { value: 'one_on_one', label: 'One-on-One' },
  { value: 'group', label: 'Group' },
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'collective', label: 'Collective' },
];

export default function EventTypesPage() {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '', slug: '', description: '', duration: 30, color: '#0069ff',
    locationType: 'google_meet', locationValue: '', eventTypeKind: 'one_on_one',
    minNotice: 240, maxFutureDays: 60, bufferBefore: 0, bufferAfter: 0,
    slotInterval: 0, dailyLimit: 0, confirmationMessage: '',
  });

  const loadData = () => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/event-types').then(r => r.json()),
    ]).then(([me, et]) => {
      setUser(me.user);
      setEventTypes(et.eventTypes || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => setForm({
    title: '', slug: '', description: '', duration: 30, color: '#0069ff',
    locationType: 'google_meet', locationValue: '', eventTypeKind: 'one_on_one',
    minNotice: 240, maxFutureDays: 60, bufferBefore: 0, bufferAfter: 0,
    slotInterval: 0, dailyLimit: 0, confirmationMessage: '',
  });

  const handleCreate = async () => {
    const res = await fetch('/api/event-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        slotInterval: form.slotInterval || null,
        dailyLimit: form.dailyLimit || null,
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      resetForm();
      loadData();
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const res = await fetch(`/api/event-types/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        slotInterval: form.slotInterval || null,
        dailyLimit: form.dailyLimit || null,
      }),
    });
    if (res.ok) {
      setEditingId(null);
      resetForm();
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to archive this event type?')) return;
    await fetch(`/api/event-types/${id}`, { method: 'DELETE' });
    loadData();
  };

  const handleDuplicate = async (id: string) => {
    await fetch(`/api/event-types/${id}/duplicate`, { method: 'POST' });
    loadData();
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch(`/api/event-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    loadData();
  };

  const startEdit = (et: any) => {
    setForm({
      title: et.title, slug: et.slug, description: et.description || '',
      duration: et.duration, color: et.color, locationType: et.locationType,
      locationValue: et.locationValue || '', eventTypeKind: et.eventTypeKind,
      minNotice: et.minNotice, maxFutureDays: et.maxFutureDays,
      bufferBefore: et.bufferBefore, bufferAfter: et.bufferAfter,
      slotInterval: et.slotInterval || 0, dailyLimit: et.dailyLimit || 0,
      confirmationMessage: et.confirmationMessage || '',
    });
    setEditingId(et.id);
    setMenuOpen(null);
  };

  const kindIcons: Record<string, any> = {
    one_on_one: LayoutGrid,
    group: Users,
    round_robin: RefreshCw,
    collective: UserCheck,
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/${user?.slug}/${slug}`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin-slow w-8 h-8 border-2 border-[#0069ff] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Types</h1>
          <p className="text-gray-500 mt-1">Create and manage your scheduling event types</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreate(true); }}>
          <Plus className="w-4 h-4" /> New Event Type
        </Button>
      </div>

      {eventTypes.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="w-12 h-12" />}
          title="No event types yet"
          description="Create your first event type to start accepting bookings from prospects and leads."
          action={{ label: 'Create Event Type', onClick: () => { resetForm(); setShowCreate(true); } }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventTypes.map(et => {
            const KindIcon = kindIcons[et.eventTypeKind] || LayoutGrid;
            return (
              <Card key={et.id} padding={false} className={`overflow-hidden ${!et.isActive ? 'opacity-60' : ''}`}>
                <div className="h-1.5" style={{ backgroundColor: et.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <KindIcon className="w-4 h-4 text-gray-400" />
                      <Badge variant={et.isActive ? 'success' : 'default'}>
                        {et.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === et.id ? null : et.id)} className="p-1 hover:bg-gray-100 rounded">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      {menuOpen === et.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 animate-fade-in">
                          <button onClick={() => startEdit(et)} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button onClick={() => { handleDuplicate(et.id); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <Copy className="w-4 h-4" /> Duplicate
                          </button>
                          <button onClick={() => { handleToggle(et.id, et.isActive); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            {et.isActive ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                            {et.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => { handleDelete(et.id); setMenuOpen(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                            <Archive className="w-4 h-4" /> Archive
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1">{et.title}</h3>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{et.description || 'No description'}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>{et.duration} min</span>
                    <span>{et.locationType.replace(/_/g, ' ')}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button onClick={() => copyLink(et.slug)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </button>
                    <a href={`/${user?.slug}/${et.slug}`} target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" /> Preview
                    </a>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showCreate || !!editingId}
        onClose={() => { setShowCreate(false); setEditingId(null); resetForm(); }}
        title={editingId ? 'Edit Event Type' : 'New Event Type'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Book a Demo" required />
            <Input label="URL Slug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="book-a-demo" helperText={`kalendr.io/${user?.slug}/${form.slug || '...'}`} />
          </div>

          <Input label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description shown to invitees" />

          <div className="grid grid-cols-3 gap-4">
            <Input label="Duration (minutes)" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 30 })} min={5} max={480} />
            <Select label="Location" value={form.locationType} onChange={e => setForm({ ...form, locationType: e.target.value })} options={LOCATION_TYPES} />
            <Select label="Event Kind" value={form.eventTypeKind} onChange={e => setForm({ ...form, eventTypeKind: e.target.value })} options={EVENT_KINDS} />
          </div>

          {form.locationType === 'phone' && (
            <Input label="Phone Number" value={form.locationValue} onChange={e => setForm({ ...form, locationValue: e.target.value })} placeholder="+1 (555) 000-0000" />
          )}
          {form.locationType === 'in_person' && (
            <Input label="Address" value={form.locationValue} onChange={e => setForm({ ...form, locationValue: e.target.value })} placeholder="123 Main St, City" />
          )}
          {form.locationType === 'custom' && (
            <Input label="Custom Location" value={form.locationValue} onChange={e => setForm({ ...form, locationValue: e.target.value })} placeholder="Instructions for joining" />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2">
              {EVENT_COLORS.map(c => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <details className="border border-gray-200 rounded-lg">
            <summary className="px-4 py-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50">Advanced Settings</summary>
            <div className="px-4 pb-4 space-y-4 border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Minimum Notice (minutes)" type="number" value={form.minNotice} onChange={e => setForm({ ...form, minNotice: parseInt(e.target.value) || 0 })} helperText="e.g., 240 = 4 hours" />
                <Input label="Max Future Days" type="number" value={form.maxFutureDays} onChange={e => setForm({ ...form, maxFutureDays: parseInt(e.target.value) || 60 })} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Buffer Before (min)" type="number" value={form.bufferBefore} onChange={e => setForm({ ...form, bufferBefore: parseInt(e.target.value) || 0 })} />
                <Input label="Buffer After (min)" type="number" value={form.bufferAfter} onChange={e => setForm({ ...form, bufferAfter: parseInt(e.target.value) || 0 })} />
                <Input label="Slot Interval (min)" type="number" value={form.slotInterval} onChange={e => setForm({ ...form, slotInterval: parseInt(e.target.value) || 0 })} helperText="0 = use duration" />
              </div>
              <Input label="Daily Limit" type="number" value={form.dailyLimit} onChange={e => setForm({ ...form, dailyLimit: parseInt(e.target.value) || 0 })} helperText="0 = no limit" />
              <Input label="Confirmation Message" value={form.confirmationMessage} onChange={e => setForm({ ...form, confirmationMessage: e.target.value })} placeholder="Thank you for booking!" />
            </div>
          </details>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditingId(null); resetForm(); }}>Cancel</Button>
            <Button onClick={editingId ? handleUpdate : handleCreate}>
              {editingId ? 'Save Changes' : 'Create Event Type'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
