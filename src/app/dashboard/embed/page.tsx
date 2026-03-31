'use client';
import { useState, useEffect } from 'react';
import { Code, Copy, Check, ExternalLink, Monitor, MessageSquare, MousePointer } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

export default function EmbedPage() {
  const [user, setUser] = useState<any>(null);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [selectedET, setSelectedET] = useState('');
  const [embedType, setEmbedType] = useState('inline');
  const [embedCode, setEmbedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/event-types').then(r => r.json()),
    ]).then(([me, et]) => {
      setUser(me.user);
      setEventTypes(et.eventTypes || []);
      if (et.eventTypes?.length > 0) setSelectedET(et.eventTypes[0].slug);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || !selectedET) return;
    fetch(`/api/embed?username=${user.slug}&slug=${selectedET}&type=${embedType}`)
      .then(r => r.json())
      .then(data => setEmbedCode(data.code));
  }, [user, selectedET, embedType]);

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const embedTypes = [
    { id: 'inline', label: 'Inline Embed', icon: Monitor, description: 'Embed the booking page directly on your website' },
    { id: 'popup-widget', label: 'Popup Widget', icon: MousePointer, description: 'Floating button that opens a booking popup' },
    { id: 'popup-text', label: 'Popup Link', icon: MessageSquare, description: 'Text link that opens a booking popup' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin-slow w-8 h-8 border-2 border-[#0069ff] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Embed & Share</h1>
        <p className="text-gray-500 mt-1">Add booking to your website, landing pages, or emails</p>
      </div>

      <Card>
        <div className="space-y-4">
          <Select
            label="Event Type"
            value={selectedET}
            onChange={e => setSelectedET(e.target.value)}
            options={eventTypes.map(et => ({ value: et.slug, label: et.title }))}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Embed Type</label>
            <div className="grid grid-cols-3 gap-3">
              {embedTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setEmbedType(type.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    embedType === type.id
                      ? 'border-[#0069ff] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <type.icon className={`w-5 h-5 mb-2 ${embedType === type.id ? 'text-[#0069ff]' : 'text-gray-400'}`} />
                  <p className="text-sm font-medium text-gray-900">{type.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Code className="w-4 h-4 text-gray-400" /> Embed Code
          </h3>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
        </div>
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
          <code>{embedCode}</code>
        </pre>
      </Card>

      <Card>
        <h3 className="font-medium text-gray-900 mb-3">Direct Link</h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700 truncate">
            {typeof window !== 'undefined' ? window.location.origin : ''}/{user?.slug}/{selectedET}
          </code>
          <Button variant="outline" size="sm" onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/${user?.slug}/${selectedET}`);
          }}>
            <Copy className="w-4 h-4" />
          </Button>
          <a href={`/${user?.slug}/${selectedET}`} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
