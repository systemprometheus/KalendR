'use client';
import { useState, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, XCircle, Check } from 'lucide-react';

function CancelForm({ uid }: { uid: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [reason, setReason] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCancel = async () => {
    setLoading(true);
    const res = await fetch(`/api/bookings/${uid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', cancelToken: token, reason }),
    });
    const data = await res.json();
    if (res.ok) {
      setCancelled(true);
    } else {
      setError(data.error || 'Failed to cancel');
    }
    setLoading(false);
  };

  if (cancelled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Meeting Cancelled</h2>
          <p className="text-gray-500">The meeting has been cancelled. Both parties have been notified.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cancel Meeting</h2>
          <p className="text-gray-500">Are you sure you want to cancel this meeting?</p>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-sm text-red-600">{error}</div>}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
            rows={3}
            placeholder="Let them know why you're cancelling..."
          />
        </div>

        <div className="flex gap-3">
          <button onClick={() => window.history.back()} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Keep Meeting
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Cancelling...' : 'Cancel Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CancelPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" /></div>}>
      <CancelForm uid={uid} />
    </Suspense>
  );
}
