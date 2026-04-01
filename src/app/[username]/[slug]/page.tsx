'use client';
import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import { Calendar, Clock, Globe, Video, Phone, MapPin, ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { TIMEZONES, findMatchingTimezone } from '@/lib/timezones';

interface PageProps {
  params: Promise<{ username: string; slug: string }>;
}

const KALENDR_BOOKING_CTA_URL = 'https://kalendr.io/?utm_source=booking_page&utm_medium=powered_by&utm_campaign=free_scheduling_page';
const KALENDR_CONFIRMATION_CTA_URL = 'https://kalendr.io/?utm_source=booking_confirmation&utm_medium=cta&utm_campaign=free_scheduling_page';

function KalendrPromo({
  title,
  description,
  href,
  ctaLabel,
  compact = false,
  centered = false,
}: {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  compact?: boolean;
  centered?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 ${compact ? 'p-4' : 'p-5'} ${centered ? 'text-center' : ''}`}>
      <div className={`flex gap-3 ${centered ? 'flex-col items-center' : 'items-start'}`}>
        <div className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-sky-100">
          <Image
            src="/brand/kalendr-logo-clean.png"
            alt="Kalendr"
            width={116}
            height={24}
            className="h-5 w-auto"
          />
        </div>
        <div className={centered ? 'space-y-1' : 'space-y-1'}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">Powered by Kalendr</p>
          <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900`}>{title}</h3>
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600`}>{description}</p>
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`mt-3 inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-3 py-1.5 font-semibold text-sky-700 transition hover:border-sky-300 hover:text-sky-800 ${compact ? 'text-xs' : 'text-sm'}`}
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

export default function BookingPage({ params }: PageProps) {
  const { username, slug } = use(params);
  const [step, setStep] = useState<'date' | 'time' | 'form' | 'confirmed'>('date');
  const [eventType, setEventType] = useState<any>(null);
  const [host, setHost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Time slots
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Invitee timezone
  const [timezone, setTimezone] = useState('America/New_York');

  // Booking form
  const [formData, setFormData] = useState<Record<string, string>>({
    name: '', email: '', phone: '', company: '', jobTitle: '', notes: '',
  });
  const [customResponses, setCustomResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Detect timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimezone(findMatchingTimezone(tz));
    } catch {}
  }, []);

  // Load event type data
  useEffect(() => {
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();

    fetch(`/api/scheduling/${username}/${slug}?month=${month}&year=${year}&timezone=${timezone}`, {
      cache: 'no-store',
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setEventType(data.eventType);
          setHost(data.host);
          setAvailableDates(data.availableDates || []);
        }
        setLoading(false);
      })
      .catch(() => setError('Failed to load booking page'));
  }, [username, slug, currentMonth, timezone]);

  // Load time slots when date is selected
  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);

    fetch(`/api/scheduling/${username}/${slug}?date=${selectedDate}&timezone=${timezone}`, {
      cache: 'no-store',
    })
      .then(r => r.json())
      .then(data => {
        setTimeSlots(data.timeSlots || []);
        setLoadingSlots(false);
      });
  }, [selectedDate, username, slug, timezone]);

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setStep('time');
  };

  const handleSlotSelect = (slot: any) => {
    setSelectedSlot(slot);
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTypeId: eventType.id,
          startTime: selectedSlot.time,
          timezone,
          inviteeName: formData.name,
          inviteeEmail: formData.email,
          inviteePhone: formData.phone || undefined,
          inviteeCompany: formData.company || undefined,
          inviteeJobTitle: formData.jobTitle || undefined,
          inviteeNotes: formData.notes || undefined,
          customResponses: Object.keys(customResponses).length > 0 ? customResponses : undefined,
          source: 'booking_page',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStep('confirmed');
      } else {
        setError(data.error || 'Failed to book. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calendar rendering
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <h3 className="font-semibold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</h3>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isAvailable = availableDates.includes(dateStr);
            const isSelected = selectedDate === dateStr;
            const isPast = day < new Date(new Date().setHours(0,0,0,0));

            return (
              <button
                key={dateStr}
                onClick={() => isAvailable && !isPast && handleDateSelect(dateStr)}
                disabled={!isAvailable || isPast || !isCurrentMonth}
                className={`h-10 w-full rounded-lg text-sm transition-all ${
                  isSelected
                    ? 'bg-[#03b2d1] text-white font-semibold'
                    : isAvailable && !isPast && isCurrentMonth
                    ? 'text-gray-900 hover:bg-blue-50 font-medium cursor-pointer'
                    : 'text-gray-300 cursor-default'
                } ${isToday(day) && !isSelected ? 'ring-1 ring-[#03b2d1]' : ''}`}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const locationIcon = (type: string) => {
    switch (type) {
      case 'google_meet': case 'zoom': return <Video className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'in_person': return <MapPin className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const locationLabel = (type: string) => {
    switch (type) {
      case 'google_meet': return 'Google Meet';
      case 'zoom': return 'Zoom';
      case 'phone': return 'Phone Call';
      case 'in_person': return 'In Person';
      default: return 'Web Conference';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin-slow w-8 h-8 border-2 border-[#03b2d1] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !eventType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Confirmation step
  if (step === 'confirmed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-md w-full p-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're booked!</h2>
          <p className="text-gray-500 mb-6">
            {eventType?.confirmationMessage || 'A calendar invitation has been sent to your email address.'}
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventType?.color }} />
              <h3 className="font-semibold text-gray-900">{eventType?.title}</h3>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> {host?.name}</p>
              <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> {selectedDate && format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}</p>
              <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> {selectedSlot && format(new Date(selectedSlot.time), 'h:mm a')} - {selectedSlot && format(new Date(selectedSlot.endTime), 'h:mm a')}</p>
              <p className="flex items-center gap-2">{locationIcon(eventType?.locationType)} {locationLabel(eventType?.locationType)}</p>
              <p className="flex items-center gap-2"><Globe className="w-4 h-4 text-gray-400" /> {timezone}</p>
            </div>
          </div>
          <KalendrPromo
            title="Create your own booking page for free"
            description="Liked this booking flow? Launch your own scheduling page on Kalendr in minutes."
            href={KALENDR_CONFIRMATION_CTA_URL}
            ctaLabel="Get your free page"
            centered
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-4xl w-full overflow-hidden animate-fade-in">
        <div className="flex flex-col md:flex-row">
          {/* Left sidebar - event info */}
          <div className="md:w-80 p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-200">
            {step !== 'date' && (
              <button onClick={() => setStep(step === 'form' ? 'time' : 'date')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}

            {/* Host info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#03b2d1] flex items-center justify-center text-white font-bold text-lg">
                {host?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">{host?.name}</p>
                {host?.welcomeMessage && <p className="text-xs text-gray-500">{host.welcomeMessage}</p>}
              </div>
            </div>

            {/* Event info */}
            <h1 className="text-xl font-bold text-gray-900 mb-2">{eventType?.title}</h1>
            {eventType?.description && <p className="text-sm text-gray-500 mb-4">{eventType.description}</p>}

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{eventType?.duration} min</span>
              </div>
              <div className="flex items-center gap-2">
                {locationIcon(eventType?.locationType)}
                <span>{locationLabel(eventType?.locationType)}</span>
              </div>
              {selectedDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}</span>
                </div>
              )}
              {selectedSlot && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{format(new Date(selectedSlot.time), 'h:mm a')} - {format(new Date(selectedSlot.endTime), 'h:mm a')}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="text-sm text-gray-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:text-gray-900"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label} ({tz.offset})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <KalendrPromo
                title="Create your own booking page for free"
                description="Use Kalendr to share a polished scheduling link with your own availability."
                href={KALENDR_BOOKING_CTA_URL}
                ctaLabel="Get yours free"
                compact
              />
            </div>
          </div>

          {/* Right side - calendar/slots/form */}
          <div className="flex-1 p-6 md:p-8">
            {step === 'date' && (
              <div className="animate-fade-in">
                <h2 className="font-semibold text-gray-900 mb-4">Select a Date</h2>
                {renderCalendar()}
              </div>
            )}

            {step === 'time' && (
              <div className="animate-fade-in">
                <h2 className="font-semibold text-gray-900 mb-4">
                  {selectedDate && format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d')}
                </h2>

                {loadingSlots ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin-slow w-6 h-6 border-2 border-[#03b2d1] border-t-transparent rounded-full" />
                  </div>
                ) : timeSlots.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No available times on this date</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                    {timeSlots.map((slot: any) => (
                      <button
                        key={slot.time}
                        onClick={() => handleSlotSelect(slot)}
                        className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          selectedSlot?.time === slot.time
                            ? 'border-[#03b2d1] bg-[#03b2d1] text-white'
                            : 'border-gray-200 text-gray-700 hover:border-[#03b2d1] hover:text-[#03b2d1]'
                        }`}
                      >
                        {format(new Date(slot.time), 'h:mm a')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 'form' && (
              <div className="animate-fade-in">
                <h2 className="font-semibold text-gray-900 mb-4">Enter Your Details</h2>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#03b2d1] focus:border-[#03b2d1] outline-none"
                      placeholder="Your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#03b2d1] focus:border-[#03b2d1] outline-none"
                      placeholder="you@company.com"
                      required
                    />
                  </div>

                  {/* Custom Questions */}
                  {eventType?.customQuestions?.map((q: any) => (
                    <div key={q.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {q.label} {q.required && '*'}
                      </label>
                      {q.type === 'select' ? (
                        <select
                          value={customResponses[q.id] || ''}
                          onChange={e => setCustomResponses({ ...customResponses, [q.id]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#03b2d1] focus:border-[#03b2d1] outline-none bg-white"
                          required={q.required}
                        >
                          <option value="">Select...</option>
                          {q.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : q.type === 'textarea' ? (
                        <textarea
                          value={customResponses[q.id] || ''}
                          onChange={e => setCustomResponses({ ...customResponses, [q.id]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#03b2d1] focus:border-[#03b2d1] outline-none"
                          rows={3}
                          placeholder={q.placeholder || ''}
                          required={q.required}
                        />
                      ) : (
                        <input
                          type={q.type === 'phone' ? 'tel' : 'text'}
                          value={customResponses[q.id] || ''}
                          onChange={e => setCustomResponses({ ...customResponses, [q.id]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#03b2d1] focus:border-[#03b2d1] outline-none"
                          placeholder={q.placeholder || ''}
                          required={q.required}
                        />
                      )}
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#03b2d1] focus:border-[#03b2d1] outline-none"
                      rows={3}
                      placeholder="Anything else you'd like us to know?"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#03b2d1] text-white py-2.5 rounded-lg font-medium hover:bg-[#0292ab] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>Schedule Meeting</>
                    )}
                  </button>
                </form>

                <p className="text-xs text-center text-gray-400 mt-4">
                  Powered by{' '}
                  <a
                    href={KALENDR_BOOKING_CTA_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-sky-600 hover:text-sky-700"
                  >
                    Kalendr
                  </a>
                  {' '}•{' '}
                  <a
                    href={KALENDR_BOOKING_CTA_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-sky-600 hover:text-sky-700"
                  >
                    Create your free page
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
