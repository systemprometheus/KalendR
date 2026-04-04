'use client';
import { useState, useEffect } from 'react';
import { CalendarDays, Video, Phone, MapPin, Clock, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { format, parseISO } from 'date-fns';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  const loadBookings = () => {
    fetch(`/api/bookings?period=${activeTab}`).then(r => r.json()).then(data => {
      setBookings(data.bookings || []);
      setLoading(false);
    });
  };

  useEffect(() => { setLoading(true); loadBookings(); }, [activeTab]);

  const handleCancel = async (uid: string) => {
    if (!confirm('Are you sure you want to cancel this meeting?')) return;
    const booking = bookings.find(b => b.uid === uid);
    await fetch(`/api/bookings/${uid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', cancelToken: booking?.cancelToken }),
    });
    loadBookings();
  };

  const locationIcon = (type: string) => {
    switch (type) {
      case 'google_meet': case 'zoom': return <Video className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'in_person': return <MapPin className="w-4 h-4" />;
      default: return <CalendarDays className="w-4 h-4" />;
    }
  };

  const locationLabel = (booking: any) => {
    if (booking.locationType === 'google_meet') {
      return booking.meetingUrl ? 'Join Google Meet' : 'Google Meet link missing';
    }

    if (booking.locationType === 'zoom') {
      return booking.meetingUrl ? 'Join Zoom' : 'Zoom';
    }

    return (booking.locationType || '').replace(/_/g, ' ');
  };

  const tabs = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past', label: 'Past' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-500 mt-1">Manage your scheduled meetings</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin-slow w-8 h-8 border-2 border-[#03b2d1] border-t-transparent rounded-full" /></div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-12 h-12" />}
          title={activeTab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
          description={activeTab === 'upcoming' ? 'When someone books a meeting with you, it will appear here.' : 'Your completed meetings will appear here.'}
        />
      ) : (
        <div className="space-y-3">
          {bookings.map(booking => (
            <Card key={booking.id} className="hover:border-gray-300 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 text-center">
                  <p className="text-xs font-medium text-gray-500 uppercase">{format(parseISO(booking.startTime), 'EEE')}</p>
                  <p className="text-2xl font-bold text-gray-900">{format(parseISO(booking.startTime), 'd')}</p>
                  <p className="text-xs text-gray-500">{format(parseISO(booking.startTime), 'MMM')}</p>
                </div>
                <div className="w-0.5 h-16 rounded-full self-center" style={{ backgroundColor: booking.eventType?.color || '#03b2d1' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{booking.eventType?.title || 'Meeting'}</h3>
                    <Badge variant={booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'danger' : 'warning'}>
                      {booking.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">with {booking.inviteeName} ({booking.inviteeEmail})</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {format(parseISO(booking.startTime), 'h:mm a')} - {format(parseISO(booking.endTime), 'h:mm a')}
                    </span>
                    {booking.meetingUrl ? (
                      <a
                        href={booking.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[#03b2d1] hover:text-[#0292ab] hover:underline"
                      >
                        {locationIcon(booking.locationType)}
                        {locationLabel(booking)}
                      </a>
                    ) : (
                      <span className={`flex items-center gap-1 ${booking.locationType === 'google_meet' ? 'text-amber-600' : ''}`}>
                        {locationIcon(booking.locationType)}
                        {locationLabel(booking)}
                      </span>
                    )}
                  </div>
                  {booking.inviteeCompany && <p className="text-xs text-gray-400 mt-1">{booking.inviteeCompany}{booking.inviteeJobTitle ? ` • ${booking.inviteeJobTitle}` : ''}</p>}
                </div>
                {booking.status === 'confirmed' && activeTab === 'upcoming' && (
                  <div className="flex items-center gap-2">
                    {booking.meetingUrl && (
                      <a href={booking.meetingUrl} target="_blank" className="p-2 text-gray-400 hover:text-[#03b2d1] hover:bg-blue-50 rounded-lg transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleCancel(booking.uid)}>
                      <XCircle className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
