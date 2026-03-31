'use client';
import { useState, useEffect, use } from 'react';
import { Clock, User, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ username: string }>;
}

export default function UserProfilePage({ params }: PageProps) {
  const { username } = use(params);
  const [user, setUser] = useState<any>(null);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/scheduling/${username}/profile`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setUser(data.user);
          setEventTypes(data.eventTypes || []);
        }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
          <p className="text-gray-500">This scheduling page doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-2xl overflow-hidden">
        {/* Powered by ribbon */}
        <div className="absolute top-0 right-0 overflow-hidden w-28 h-28 z-10">
          <a
            href="/"
            className="absolute top-[22px] right-[-32px] w-[170px] text-center py-1.5 bg-gray-600 text-white text-[10px] font-semibold tracking-wide uppercase rotate-45 shadow-sm hover:bg-gray-700 transition-colors"
          >
            Powered by kalendr.io
          </a>
        </div>

        {/* Profile header */}
        <div className="text-center pt-10 pb-4 px-8">
          <h1 className="text-lg font-bold text-gray-900">{user.name}</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
            {user.welcomeMessage || 'Welcome to my scheduling page. Please follow the instructions to add an event to my calendar.'}
          </p>
        </div>

        {/* Divider */}
        <div className="mx-8 border-t border-gray-200" />

        {/* Event types list */}
        <div className="py-4 px-8">
          {eventTypes.map(et => (
            <Link
              key={et.id}
              href={`/${username}/${et.slug}`}
              className="flex items-center gap-4 py-4 group hover:bg-gray-50 -mx-4 px-4 rounded-lg transition-colors"
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: et.color }}
              />
              <span className="flex-1 text-sm font-semibold text-[#0069ff] group-hover:underline">
                {et.title}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </Link>
          ))}

          {eventTypes.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-8">No event types available.</p>
          )}
        </div>

        {/* Cookie settings link */}
        <div className="px-8 pb-6">
          <a href="#" className="text-xs text-[#0069ff] hover:underline">Cookie settings</a>
        </div>
      </div>
    </div>
  );
}
