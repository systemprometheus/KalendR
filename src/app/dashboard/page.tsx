'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, CalendarDays, Clock, Users, ArrowRight, LayoutGrid, Copy, ExternalLink, Video, Phone, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/bookings?period=upcoming').then(r => r.json()),
      fetch('/api/event-types').then(r => r.json()),
    ]).then(([me, bk, et]) => {
      setUser(me.user);
      setBookings(bk.bookings || []);
      setEventTypes(et.eventTypes || []);
      setLoading(false);
    });
  }, []);

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/${user?.slug}/${slug}`;
    navigator.clipboard.writeText(url);
  };

  const formatBookingDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`;
    return format(date, 'EEE, MMM d at h:mm a');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin-slow w-8 h-8 border-2 border-[#03b2d1] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your scheduling.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Upcoming Meetings', value: bookings.length, icon: CalendarDays, color: 'text-[#03b2d1]' },
          { label: 'Active Event Types', value: eventTypes.filter((e: any) => e.isActive).length, icon: LayoutGrid, color: 'text-emerald-500' },
          { label: 'This Week', value: bookings.filter((b: any) => { const d = new Date(b.startTime); const now = new Date(); const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7); return d <= weekEnd; }).length, icon: Clock, color: 'text-amber-500' },
          { label: 'Today', value: bookings.filter((b: any) => isToday(parseISO(b.startTime))).length, icon: Calendar, color: 'text-violet-500' },
        ].map(stat => (
          <Card key={stat.label}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Bookings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h2>
            <Link href="/dashboard/bookings" className="text-sm text-[#03b2d1] hover:text-[#0292ab] flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {bookings.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No upcoming bookings</p>
                <p className="text-xs text-gray-400 mt-1">Share your booking link to get started</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 5).map((booking: any) => (
                <Card key={booking.id} className="hover:border-gray-300 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-1 h-12 rounded-full" style={{ backgroundColor: booking.eventType?.color || '#03b2d1' }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{booking.inviteeName}</p>
                      <p className="text-sm text-gray-500">{booking.eventType?.title}</p>
                      <p className="text-sm text-gray-400 mt-1">{formatBookingDate(booking.startTime)}</p>
                    </div>
                    <Badge variant={booking.status === 'confirmed' ? 'success' : 'warning'}>
                      {booking.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Event Types */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Event Types</h2>
            <Link href="/dashboard/event-types" className="text-sm text-[#03b2d1] hover:text-[#0292ab] flex items-center gap-1">
              Manage <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {eventTypes.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <LayoutGrid className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No event types yet</p>
                <Link href="/dashboard/event-types">
                  <Button size="sm" className="mt-3">Create Event Type</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {eventTypes.slice(0, 5).map((et: any) => (
                <Card key={et.id} className="hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: et.color + '20' }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: et.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{et.title}</p>
                      <p className="text-sm text-gray-500">{et.duration} min • {et.locationType.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => copyLink(et.slug)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Copy link">
                        <Copy className="w-4 h-4" />
                      </button>
                      <Link href={`/${user?.slug}/${et.slug}`} target="_blank" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Preview">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Share */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Share your scheduling link</h3>
            <p className="text-sm text-gray-500 mt-1">Send this link to prospects to let them book time with you</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700">
              {typeof window !== 'undefined' ? window.location.origin : ''}/{user?.slug}
            </code>
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/${user?.slug}`);
            }}>
              <Copy className="w-4 h-4" /> Copy
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
