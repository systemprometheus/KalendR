'use client';
import { useState, useEffect, use } from 'react';
import { Calendar, Clock, Video, Phone, MapPin, User } from 'lucide-react';
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

  const locationLabel = (type: string) => {
    switch (type) {
      case 'google_meet': return 'Google Meet';
      case 'zoom': return 'Zoom';
      case 'phone': return 'Phone';
      case 'in_person': return 'In Person';
      default: return 'Video';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin-slow w-8 h-8 border-2 border-[#0069ff] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
          <p className="text-gray-500">This scheduling page doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Profile header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#0069ff] flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
            {user.name?.charAt(0)?.toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
          {user.bio && <p className="text-gray-500 mt-1">{user.bio}</p>}
          {user.welcomeMessage && <p className="text-sm text-gray-400 mt-2">{user.welcomeMessage}</p>}
        </div>

        {/* Event types */}
        <div className="space-y-3">
          {eventTypes.map(et => (
            <Link
              key={et.id}
              href={`/${username}/${et.slug}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-[#0069ff] hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: et.color }} />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-[#0069ff] transition-colors">{et.title}</h3>
                  {et.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{et.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {et.duration} min</span>
                    <span>{locationLabel(et.locationType)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">Powered by KalendR</p>
      </div>
    </div>
  );
}
