'use client';
import { useState, useEffect } from 'react';
import { GitBranch, Plus, Trash2, Pencil, ExternalLink, Copy, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';

export default function RoutingFormsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form builder state
  const [fields, setFields] = useState<any[]>([
    { id: 'email', label: 'Email', type: 'email', required: true },
    { id: 'name', label: 'Full Name', type: 'text', required: true },
    { id: 'company', label: 'Company', type: 'text', required: true },
    { id: 'company_size', label: 'Company Size', type: 'select', required: true, options: ['1-10', '11-50', '51-200', '201-1000', '1000+'] },
  ]);
  const [routes, setRoutes] = useState<any[]>([]);

  const loadData = () => {
    Promise.all([
      fetch('/api/routing-forms').then(r => r.json()),
      fetch('/api/event-types').then(r => r.json()),
    ]).then(([rf, et]) => {
      setForms(rf.routingForms || []);
      setEventTypes(et.eventTypes || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    const res = await fetch('/api/routing-forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName,
        description: formDescription,
        fields,
        routes,
        fallbackType: 'message',
        fallbackValue: 'Thank you for your interest. A team member will reach out soon.',
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      setFormName('');
      setFormDescription('');
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this routing form?')) return;
    await fetch(`/api/routing-forms/${id}`, { method: 'DELETE' });
    loadData();
  };

  const addRoute = () => {
    setRoutes([...routes, {
      id: Math.random().toString(36).substr(2, 9),
      conditions: [{ fieldId: 'company_size', operator: 'equals', value: '1000+' }],
      logic: 'and',
      destination: { type: 'event_type', value: eventTypes[0]?.id || '' },
    }]);
  };

  const addField = () => {
    setFields([...fields, {
      id: `field_${Date.now()}`,
      label: 'New Question',
      type: 'text',
      required: false,
    }]);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin-slow w-8 h-8 border-2 border-[#03b2d1] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routing Forms</h1>
          <p className="text-gray-500 mt-1">Qualify and route inbound leads to the right rep or event type</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Routing Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <EmptyState
          icon={<GitBranch className="w-12 h-12" />}
          title="No routing forms yet"
          description="Create a routing form to qualify leads and route them to the right event type or team member."
          action={{ label: 'Create Routing Form', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forms.map(form => {
            let fieldCount = 0;
            let routeCount = 0;
            try { fieldCount = JSON.parse(form.fields).length; } catch {}
            try { routeCount = JSON.parse(form.routes).length; } catch {}

            return (
              <Card key={form.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-[#03b2d1]" />
                    <Badge variant={form.isActive ? 'success' : 'default'}>{form.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <button onClick={() => handleDelete(form.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{form.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{form.description || 'No description'}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{fieldCount} questions</span>
                  <span>{routeCount} routes</span>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/route/${form.slug}`)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </button>
                  <a href={`/route/${form.slug}`} target="_blank" className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                    <ExternalLink className="w-3.5 h-3.5" /> Preview
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Routing Form" size="xl">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Form Name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Inbound Lead Qualification" />
            <Input label="Description" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Route leads to the right rep" />
          </div>

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Questions</h3>
              <Button variant="ghost" size="sm" onClick={addField}><Plus className="w-3 h-3" /> Add</Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-400 w-6">{i + 1}.</span>
                  <input value={field.label} onChange={e => { const f = [...fields]; f[i].label = e.target.value; setFields(f); }} className="flex-1 text-sm border border-gray-200 rounded px-2 py-1" />
                  <select value={field.type} onChange={e => { const f = [...fields]; f[i].type = e.target.value; setFields(f); }} className="text-sm border border-gray-200 rounded px-2 py-1">
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="select">Dropdown</option>
                    <option value="radio">Radio</option>
                    <option value="phone">Phone</option>
                    <option value="number">Number</option>
                    <option value="textarea">Long Text</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input type="checkbox" checked={field.required} onChange={e => { const f = [...fields]; f[i].required = e.target.checked; setFields(f); }} className="rounded" />
                    Required
                  </label>
                  <button onClick={() => setFields(fields.filter((_, j) => j !== i))} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Routes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Routing Rules</h3>
              <Button variant="ghost" size="sm" onClick={addRoute}><Plus className="w-3 h-3" /> Add Route</Button>
            </div>
            {routes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No routing rules. All submissions will use the fallback.</p>
            ) : (
              <div className="space-y-2">
                {routes.map((route, i) => (
                  <div key={route.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-500">IF</span>
                      <select value={route.conditions[0]?.fieldId || ''} onChange={e => { const r = [...routes]; r[i].conditions[0].fieldId = e.target.value; setRoutes(r); }} className="text-sm border border-gray-200 rounded px-2 py-1">
                        {fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                      <select value={route.conditions[0]?.operator || 'equals'} onChange={e => { const r = [...routes]; r[i].conditions[0].operator = e.target.value; setRoutes(r); }} className="text-sm border border-gray-200 rounded px-2 py-1">
                        <option value="equals">equals</option>
                        <option value="not_equals">does not equal</option>
                        <option value="contains">contains</option>
                      </select>
                      <input value={route.conditions[0]?.value || ''} onChange={e => { const r = [...routes]; r[i].conditions[0].value = e.target.value; setRoutes(r); }} className="flex-1 text-sm border border-gray-200 rounded px-2 py-1" placeholder="Value" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">THEN route to</span>
                      <select value={route.destination.value} onChange={e => { const r = [...routes]; r[i].destination.value = e.target.value; setRoutes(r); }} className="text-sm border border-gray-200 rounded px-2 py-1 flex-1">
                        {eventTypes.map(et => <option key={et.id} value={et.id}>{et.title}</option>)}
                      </select>
                      <button onClick={() => setRoutes(routes.filter((_, j) => j !== i))} className="p-1 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Routing Form</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
