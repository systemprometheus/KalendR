'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Building2,
  CalendarDays,
  Contact,
  Mail,
  Phone,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';

type Booking = {
  id: string;
  uid: string;
  startTime: string;
  endTime: string;
  status: string;
  inviteeName?: string | null;
  inviteeEmail?: string | null;
  inviteePhone?: string | null;
  inviteeCompany?: string | null;
  inviteeJobTitle?: string | null;
  inviteeNotes?: string | null;
  source?: string | null;
  timezone?: string | null;
  eventType?: {
    title?: string | null;
    color?: string | null;
    duration?: number | null;
  } | null;
};

type ContactRecord = {
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  notes: string | null;
  source: string | null;
  totalMeetings: number;
  confirmedMeetings: number;
  pendingMeetings: number;
  cancelledMeetings: number;
  lastMeeting: Booking | null;
  nextMeeting: Booking | null;
};

function getTimestamp(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function formatSourceLabel(source?: string | null) {
  return source ? source.replace(/_/g, ' ') : 'booking page';
}

function formatMeetingSummary(booking: Booking | null) {
  if (!booking) return 'No meetings yet';
  return `${format(parseISO(booking.startTime), 'MMM d, yyyy')} • ${booking.eventType?.title || 'Meeting'}`;
}

function aggregateContacts(bookings: Booking[]) {
  const now = Date.now();
  const records = new Map<string, ContactRecord>();

  for (const booking of bookings) {
    const email = booking.inviteeEmail?.trim().toLowerCase();
    if (!email) continue;

    const existing = records.get(email) || {
      email,
      name: booking.inviteeName?.trim() || email,
      phone: booking.inviteePhone || null,
      company: booking.inviteeCompany || null,
      jobTitle: booking.inviteeJobTitle || null,
      notes: booking.inviteeNotes || null,
      source: booking.source || null,
      totalMeetings: 0,
      confirmedMeetings: 0,
      pendingMeetings: 0,
      cancelledMeetings: 0,
      lastMeeting: null,
      nextMeeting: null,
    };

    existing.name = booking.inviteeName?.trim() || existing.name;
    existing.phone = booking.inviteePhone || existing.phone;
    existing.company = booking.inviteeCompany || existing.company;
    existing.jobTitle = booking.inviteeJobTitle || existing.jobTitle;
    existing.notes = booking.inviteeNotes || existing.notes;
    existing.source = booking.source || existing.source;
    existing.totalMeetings += 1;

    if (booking.status === 'confirmed') existing.confirmedMeetings += 1;
    if (booking.status === 'pending') existing.pendingMeetings += 1;
    if (booking.status === 'cancelled') existing.cancelledMeetings += 1;

    const bookingTime = getTimestamp(booking.startTime);
    if (bookingTime <= now) {
      const lastMeetingTime = getTimestamp(existing.lastMeeting?.startTime);
      if (!existing.lastMeeting || bookingTime > lastMeetingTime) {
        existing.lastMeeting = booking;
      }
    }

    if (booking.status !== 'cancelled' && bookingTime >= now) {
      const nextMeetingTime = getTimestamp(existing.nextMeeting?.startTime);
      if (!existing.nextMeeting || bookingTime < nextMeetingTime) {
        existing.nextMeeting = booking;
      }
    }

    records.set(email, existing);
  }

  return Array.from(records.values()).sort((left, right) => {
    const leftNext = getTimestamp(left.nextMeeting?.startTime);
    const rightNext = getTimestamp(right.nextMeeting?.startTime);
    if (leftNext && rightNext) return leftNext - rightNext;
    if (leftNext) return -1;
    if (rightNext) return 1;

    const leftLast = getTimestamp(left.lastMeeting?.startTime);
    const rightLast = getTimestamp(right.lastMeeting?.startTime);
    if (leftLast !== rightLast) return rightLast - leftLast;

    return right.totalMeetings - left.totalMeetings;
  });
}

export default function ContactsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadBookings() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/bookings');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load contacts');
        }

        if (!cancelled) {
          setBookings(data.bookings || []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load contacts');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      cancelled = true;
    };
  }, []);

  const contacts = aggregateContacts(bookings);
  const query = search.trim().toLowerCase();
  const filteredContacts = contacts.filter((contact) => {
    if (!query) return true;

    return [
      contact.name,
      contact.email,
      contact.company,
      contact.jobTitle,
      contact.phone,
    ].some((value) => value?.toLowerCase().includes(query));
  });

  const contactsWithUpcoming = contacts.filter((contact) => contact.nextMeeting).length;
  const repeatContacts = contacts.filter((contact) => contact.totalMeetings > 1).length;
  const sourcedFromRouting = contacts.filter((contact) => contact.source === 'routing_form').length;
  const withCompanyDetails = contacts.filter((contact) => contact.company || contact.jobTitle).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-1 text-gray-500">
            Every person who books with you shows up here automatically.
          </p>
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, company, or phone"
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Total contacts</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{contacts.length}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-[#03b2d1]">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Upcoming meetings</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{contactsWithUpcoming}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Repeat contacts</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{repeatContacts}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Enriched profiles</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{withCompanyDetails}</p>
              <p className="mt-1 text-xs text-gray-400">{sourcedFromRouting} came through routing forms</p>
            </div>
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">People you have met</h2>
              <p className="text-sm text-gray-500">
                Built from your booking history so you always have context before the next call.
              </p>
            </div>
            <Badge variant="info">{filteredContacts.length} visible</Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin-slow rounded-full border-2 border-[#03b2d1] border-t-transparent" />
          </div>
        ) : error ? (
          <EmptyState
            icon={<Contact className="h-12 w-12" />}
            title="Contacts could not be loaded"
            description={error}
            action={{ label: 'Try again', onClick: () => window.location.reload() }}
          />
        ) : filteredContacts.length === 0 ? (
          <EmptyState
            icon={<Contact className="h-12 w-12" />}
            title={contacts.length === 0 ? 'No contacts yet' : 'No matching contacts'}
            description={
              contacts.length === 0
                ? 'Once someone books a meeting with you, their details will appear here automatically.'
                : 'Try a different search term to find the contact you are looking for.'
            }
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredContacts.map((contact) => (
              <div key={contact.email} className="px-6 py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{contact.name}</h3>
                        <p className="text-sm text-gray-500">{contact.email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={contact.nextMeeting ? 'success' : 'default'}>
                          {contact.nextMeeting ? 'Upcoming meeting' : 'No meeting scheduled'}
                        </Badge>
                        {contact.totalMeetings > 1 && (
                          <Badge variant="warning">{contact.totalMeetings} meetings</Badge>
                        )}
                        <Badge>{formatSourceLabel(contact.source)}</Badge>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 text-sm text-gray-600 md:grid-cols-2 xl:grid-cols-4">
                      <div className="flex items-start gap-2">
                        <Mail className="mt-0.5 h-4 w-4 text-gray-400" />
                        <span className="break-all">{contact.email}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="mt-0.5 h-4 w-4 text-gray-400" />
                        <span>{contact.phone || 'No phone number added'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Building2 className="mt-0.5 h-4 w-4 text-gray-400" />
                        <span>
                          {contact.company
                            ? `${contact.company}${contact.jobTitle ? ` • ${contact.jobTitle}` : ''}`
                            : 'No company details'}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CalendarDays className="mt-0.5 h-4 w-4 text-gray-400" />
                        <span>{formatMeetingSummary(contact.nextMeeting || contact.lastMeeting)}</span>
                      </div>
                    </div>

                    {contact.notes && (
                      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        {contact.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    {contact.nextMeeting && (
                      <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        Next: {format(parseISO(contact.nextMeeting.startTime), 'MMM d, h:mm a')}
                      </div>
                    )}
                    {contact.lastMeeting && (
                      <div className="rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-600">
                        Last: {format(parseISO(contact.lastMeeting.startTime), 'MMM d, yyyy')}
                      </div>
                    )}
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-all duration-150 hover:bg-gray-50"
                    >
                      Email
                    </a>
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-all duration-150 hover:bg-gray-50"
                      >
                        Call
                      </a>
                    )}
                    {!contact.phone && (
                      <Button variant="ghost" size="sm" disabled>
                        No phone
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
