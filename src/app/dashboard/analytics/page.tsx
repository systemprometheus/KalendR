'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock3,
  Copy,
  LayoutGrid,
  TrendingUp,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

const WEEKDAY_ORDER = [
  { index: 1, label: 'Mon' },
  { index: 2, label: 'Tue' },
  { index: 3, label: 'Wed' },
  { index: 4, label: 'Thu' },
  { index: 5, label: 'Fri' },
  { index: 6, label: 'Sat' },
  { index: 0, label: 'Sun' },
];

function getBookingDurationMinutes(booking: any) {
  if (booking.eventType?.duration) return booking.eventType.duration;
  if (!booking.startTime || !booking.endTime) return 0;

  const start = new Date(booking.startTime).getTime();
  const end = new Date(booking.endTime).getTime();
  return Math.max(Math.round((end - start) / 60000), 0);
}

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/bookings').then(r => r.json()),
      fetch('/api/event-types').then(r => r.json()),
    ])
      .then(([me, bookingData, eventTypeData]) => {
        if (cancelled) return;
        setUser(me.user);
        setBookings(bookingData.bookings || []);
        setEventTypes(eventTypeData.eventTypes || []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load analytics.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const now = new Date();
  const activeEventTypes = eventTypes.filter((eventType: any) => eventType.isActive);
  const confirmedBookings = bookings.filter((booking: any) => booking.status === 'confirmed');
  const pendingBookings = bookings.filter((booking: any) => booking.status === 'pending');
  const cancelledBookings = bookings.filter((booking: any) => booking.status === 'cancelled');
  const completedBookings = confirmedBookings.filter((booking: any) => parseISO(booking.startTime) < now);
  const upcomingBookings = confirmedBookings.filter((booking: any) => parseISO(booking.startTime) >= now);
  const totalBookedMinutes = confirmedBookings.reduce(
    (sum: number, booking: any) => sum + getBookingDurationMinutes(booking),
    0
  );
  const totalBookedHours = Number((totalBookedMinutes / 60).toFixed(totalBookedMinutes >= 600 ? 0 : 1));
  const averageMeetingLength = confirmedBookings.length
    ? Math.round(totalBookedMinutes / confirmedBookings.length)
    : 0;
  const confirmationRate = bookings.length ? Math.round((confirmedBookings.length / bookings.length) * 100) : 0;

  const weekdayPerformance = WEEKDAY_ORDER.map(day => ({
    ...day,
    count: confirmedBookings.filter(
      (booking: any) => parseISO(booking.startTime).getDay() === day.index
    ).length,
  }));
  const maxWeekdayCount = Math.max(...weekdayPerformance.map(day => day.count), 1);
  const busiestDay = weekdayPerformance.reduce(
    (best, current) => (current.count > best.count ? current : best),
    weekdayPerformance[0]
  );

  const topEventTypes = Object.values(
    confirmedBookings.reduce((acc: Record<string, any>, booking: any) => {
      const name = booking.eventType?.title || 'Untitled event';
      if (!acc[name]) {
        acc[name] = {
          name,
          count: 0,
          minutes: 0,
        };
      }

      acc[name].count += 1;
      acc[name].minutes += getBookingDurationMinutes(booking);
      return acc;
    }, {})
  )
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5);

  const recentBookings = [...bookings]
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, 5);

  const copySchedulingLink = async () => {
    if (!user?.slug) return;
    await navigator.clipboard.writeText(`${window.location.origin}/${user.slug}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin-slow w-8 h-8 border-2 border-[#0069ff] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="py-8 text-center">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-900">Analytics unavailable</h1>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">
            Track booking volume, meeting mix, and the health of your scheduling funnel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/bookings">
            <Button variant="outline" size="sm">
              <CalendarDays className="w-4 h-4" />
              View bookings
            </Button>
          </Link>
          <Link href="/dashboard/event-types">
            <Button size="sm">
              <LayoutGrid className="w-4 h-4" />
              Manage event types
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Confirmed meetings',
            value: confirmedBookings.length,
            helper: `${upcomingBookings.length} upcoming`,
            icon: CalendarDays,
            color: 'text-[#0069ff]',
          },
          {
            label: 'Confirmation rate',
            value: `${confirmationRate}%`,
            helper: `${pendingBookings.length} pending, ${cancelledBookings.length} cancelled`,
            icon: TrendingUp,
            color: 'text-emerald-500',
          },
          {
            label: 'Hours scheduled',
            value: totalBookedHours,
            helper: `${averageMeetingLength} min average meeting`,
            icon: Clock3,
            color: 'text-amber-500',
          },
          {
            label: 'Active event types',
            value: activeEventTypes.length,
            helper: busiestDay.count > 0 ? `${busiestDay.label} is busiest` : 'No booking trend yet',
            icon: BarChart3,
            color: 'text-violet-500',
          },
        ].map(stat => (
          <Card key={stat.label}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-2">{stat.helper}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
            </div>
          </Card>
        ))}
      </div>

      {bookings.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="w-12 h-12" />}
            title="No analytics yet"
            description="Once people start booking time with you, we’ll show volume, trends, and event type performance here."
            action={{
              label: 'Create Event Type',
              onClick: () => {
                window.location.href = '/dashboard/event-types';
              },
            }}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Bookings by weekday</h2>
                  <p className="text-sm text-gray-500 mt-1">See which days attract the most meetings.</p>
                </div>
                <Badge variant="info">{confirmedBookings.length} total</Badge>
              </div>
              <div className="space-y-4">
                {weekdayPerformance.map(day => (
                  <div key={day.label}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium text-gray-700">{day.label}</span>
                      <span className="text-gray-500">{day.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0069ff] rounded-full transition-all"
                        style={{ width: `${(day.count / maxWeekdayCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Scheduling funnel</h2>
                  <p className="text-sm text-gray-500 mt-1">A quick view of what’s completed, upcoming, and at risk.</p>
                </div>
                <Badge variant={pendingBookings.length > 0 ? 'warning' : 'success'}>
                  {pendingBookings.length > 0 ? 'Needs follow-up' : 'Healthy'}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Completed', value: completedBookings.length, tone: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Upcoming', value: upcomingBookings.length, tone: 'bg-blue-50 text-blue-700' },
                  { label: 'Pending', value: pendingBookings.length, tone: 'bg-amber-50 text-amber-700' },
                ].map(item => (
                  <div key={item.label} className={`rounded-xl px-4 py-5 ${item.tone}`}>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-3xl font-bold mt-2">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Cancelled meetings</span>
                  <span className="font-medium text-gray-900">{cancelledBookings.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Average load per active event type</span>
                  <span className="font-medium text-gray-900">
                    {activeEventTypes.length ? (confirmedBookings.length / activeEventTypes.length).toFixed(1) : '0.0'}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Top event types</h2>
                  <p className="text-sm text-gray-500 mt-1">Find out which meeting types drive the most activity.</p>
                </div>
                <Link href="/dashboard/event-types" className="text-sm text-[#0069ff] hover:text-[#0052cc] flex items-center gap-1">
                  Manage <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {topEventTypes.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  Confirmed bookings will surface your best-performing event types here.
                </div>
              ) : (
                <div className="space-y-4">
                  {topEventTypes.map((eventType: any) => {
                    const share = confirmedBookings.length ? Math.round((eventType.count / confirmedBookings.length) * 100) : 0;

                    return (
                      <div key={eventType.name}>
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{eventType.name}</p>
                            <p className="text-sm text-gray-500">
                              {eventType.count} bookings • {Math.round(eventType.minutes / Math.max(eventType.count, 1))} min avg
                            </p>
                          </div>
                          <span className="text-sm font-medium text-gray-700">{share}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Recent booking activity</h2>
                  <p className="text-sm text-gray-500 mt-1">The latest scheduling activity across your meetings.</p>
                </div>
                <Link href="/dashboard/bookings" className="text-sm text-[#0069ff] hover:text-[#0052cc] flex items-center gap-1">
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-3">
                {recentBookings.map((booking: any) => (
                  <div key={booking.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{booking.inviteeName}</p>
                      <p className="text-sm text-gray-500 truncate">{booking.eventType?.title || 'Untitled event'}</p>
                      <p className="text-xs text-gray-400 mt-1">{format(parseISO(booking.startTime), 'EEE, MMM d • h:mm a')}</p>
                    </div>
                    <Badge
                      variant={
                        booking.status === 'confirmed'
                          ? 'success'
                          : booking.status === 'pending'
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Share your booking link</h2>
            <p className="text-sm text-gray-500 mt-1">
              More traffic to your scheduling page means better analytics here.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
              {typeof window !== 'undefined' ? window.location.origin : ''}/{user?.slug}
            </code>
            <Button variant="outline" onClick={copySchedulingLink}>
              <Copy className="w-4 h-4" />
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
