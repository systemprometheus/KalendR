'use client';
import { useState, use } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';

export default function ReschedulePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center">
        <RefreshCw className="w-12 h-12 text-[#03b2d1] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Reschedule Meeting</h2>
        <p className="text-gray-500 mb-4">
          To reschedule, please cancel this meeting and book a new time.
        </p>
        <a
          href={`/booking/${uid}/cancel${typeof window !== 'undefined' ? window.location.search : ''}`}
          className="inline-block px-6 py-2 bg-[#03b2d1] text-white rounded-lg text-sm font-medium hover:bg-[#0292ab]"
        >
          Cancel & Rebook
        </a>
      </div>
    </div>
  );
}
