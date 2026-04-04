'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ArrowRight, Check, GitBranch } from 'lucide-react';
import Logo from '@/components/ui/logo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function RoutingFormPage({ params }: PageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch routing form by slug
    fetch(`/api/routing-forms/by-slug/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.routingForm) {
          setForm(data.routingForm);
        } else {
          setError('Form not found');
        }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch(`/api/routing-forms/${form.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses }),
    });

    const data = await res.json();

    if (data.destination) {
      if (data.destination.type === 'event_type' && data.destination.username) {
        router.push(`/${data.destination.username}/${data.destination.eventSlug}`);
        return;
      }
      if (data.destination.type === 'external_url') {
        window.location.href = data.destination.url;
        return;
      }
      setResult(data.destination);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin-slow w-8 h-8 border-2 border-[#03b2d1] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Form Not Found</h2>
        </div>
      </div>
    );
  }

  if (result?.type === 'message') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center">
          <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Thank You</h2>
          <p className="text-gray-500">{result.message}</p>
        </div>
      </div>
    );
  }

  let fields: any[] = [];
  try { fields = JSON.parse(form.fields); } catch {}

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border max-w-lg w-full p-8 animate-fade-in">
        <div className="mb-6">
          <Logo size="md" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">{form.name}</h1>
        {form.description && <p className="text-gray-500 mb-6">{form.description}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field: any) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'select' || field.type === 'radio' ? (
                <select
                  value={responses[field.id] || ''}
                  onChange={e => setResponses({ ...responses, [field.id]: e.target.value })}
                  required={field.required}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-[#03b2d1] focus:border-[#03b2d1] outline-none"
                >
                  <option value="">Select...</option>
                  {(field.options || []).map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={responses[field.id] || ''}
                  onChange={e => setResponses({ ...responses, [field.id]: e.target.value })}
                  required={field.required}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#03b2d1] focus:border-[#03b2d1] outline-none"
                  rows={3}
                />
              ) : (
                <input
                  type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : 'text'}
                  value={responses[field.id] || ''}
                  onChange={e => setResponses({ ...responses, [field.id]: e.target.value })}
                  required={field.required}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#03b2d1] focus:border-[#03b2d1] outline-none"
                  placeholder={field.placeholder || ''}
                />
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#03b2d1] text-white py-2.5 rounded-lg font-medium hover:bg-[#0292ab] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? 'Submitting...' : 'Continue'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <a
          href="https://kalendr.io"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 block text-xs text-center text-gray-400 hover:text-gray-500 transition-colors"
        >
          Powered by kalendr.io
        </a>
      </div>
    </div>
  );
}
