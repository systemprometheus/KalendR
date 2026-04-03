import { loadConfig, type KalendrioConfig } from './config.js';

export type RequestOptions = {
  authRequired?: boolean;
};

export class KalendrioApiError extends Error {
  status: number;
  reason: string;
  details: unknown;
  suggestedNextAction?: string;

  constructor(params: {
    message: string;
    status: number;
    reason: string;
    details?: unknown;
    suggestedNextAction?: string;
  }) {
    super(params.message);
    this.name = 'KalendrioApiError';
    this.status = params.status;
    this.reason = params.reason;
    this.details = params.details;
    this.suggestedNextAction = params.suggestedNextAction;
  }
}

export class KalendrioClient {
  private readonly config: KalendrioConfig;

  constructor(config: KalendrioConfig = loadConfig()) {
    this.config = config;
  }

  hasAuth() {
    return Boolean(this.config.KALENDRIO_SESSION_COOKIE || this.config.KALENDRIO_BEARER_TOKEN);
  }

  async getPublicEventType(username: string, slug: string) {
    return this.request(`/api/scheduling/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`);
  }

  async listAvailableDates(params: { username: string; slug: string; month: number; year: number; timezone: string }) {
    const query = new URLSearchParams({
      month: String(params.month),
      year: String(params.year),
      timezone: params.timezone,
    });

    return this.request(`/api/scheduling/${encodeURIComponent(params.username)}/${encodeURIComponent(params.slug)}?${query}`);
  }

  async listTimeSlots(params: { username: string; slug: string; date: string; timezone: string }) {
    const query = new URLSearchParams({
      date: params.date,
      timezone: params.timezone,
    });

    return this.request(`/api/scheduling/${encodeURIComponent(params.username)}/${encodeURIComponent(params.slug)}?${query}`);
  }

  async createBooking(payload: Record<string, unknown>) {
    return this.request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  async listBookings(params?: { status?: string; period?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.period) query.set('period', params.period);
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.request(`/api/bookings${suffix}`, undefined, { authRequired: true });
  }

  async getBooking(uid: string) {
    return this.request(`/api/bookings/${encodeURIComponent(uid)}`, undefined, { authRequired: true });
  }

  async cancelBooking(uid: string, reason?: string) {
    return this.request(`/api/bookings/${encodeURIComponent(uid)}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'cancel', reason }),
      headers: {
        'content-type': 'application/json',
      },
    }, { authRequired: true });
  }

  async rescheduleBooking(uid: string, newStartTime: string) {
    return this.request(`/api/bookings/${encodeURIComponent(uid)}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'reschedule', newStartTime }),
      headers: {
        'content-type': 'application/json',
      },
    }, { authRequired: true });
  }

  async listEventTypes() {
    return this.request('/api/event-types', undefined, { authRequired: true });
  }

  async createEventType(payload: Record<string, unknown>) {
    return this.request('/api/event-types', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
      },
    }, { authRequired: true });
  }

  async listConnectedCalendars() {
    return this.request('/api/integrations/calendars', undefined, { authRequired: true });
  }

  private async request(path: string, init?: RequestInit, options?: RequestOptions) {
    const headers = new Headers(init?.headers ?? {});
    headers.set('accept', 'application/json');
    headers.set('user-agent', this.config.KALENDRIO_USER_AGENT);

    if (this.config.KALENDRIO_SESSION_COOKIE) {
      headers.set('cookie', this.config.KALENDRIO_SESSION_COOKIE);
    }

    if (this.config.KALENDRIO_BEARER_TOKEN) {
      headers.set('authorization', `Bearer ${this.config.KALENDRIO_BEARER_TOKEN}`);
    }

    if (options?.authRequired && !this.hasAuth()) {
      throw new Error('This tool requires Kalendrio auth. Set KALENDRIO_SESSION_COOKIE or KALENDRIO_BEARER_TOKEN.');
    }

    const response = await fetch(new URL(path, this.config.KALENDRIO_BASE_URL), {
      ...init,
      headers,
    });

    const rawText = await response.text();
    const data = rawText ? safeJsonParse(rawText) : null;

    if (!response.ok) {
      throw buildApiError(response.status, data);
    }

    return data;
  }
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractErrorMessage(data: unknown) {
  if (typeof data === 'object' && data && 'error' in data && typeof data.error === 'string') {
    return data.error;
  }

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  return '';
}

function buildApiError(status: number, data: unknown) {
  const upstreamMessage = extractErrorMessage(data);
  const message = upstreamMessage ? `Kalendrio API ${status}: ${upstreamMessage}` : `Kalendrio API ${status}`;
  const normalized = upstreamMessage.toLowerCase();

  let reason = 'request_failed';
  let suggestedNextAction: string | undefined;

  if (status === 400) {
    reason = 'validation_error';
    suggestedNextAction = 'Verify the tool inputs and try again.';
  } else if (status === 403) {
    reason = 'forbidden';
    suggestedNextAction = 'Use a token with the required scope and retry.';
  } else if (status === 401) {
    reason = 'unauthorized';
    suggestedNextAction = 'Authenticate with a Kalendrio agent token or session and retry.';
  } else if (status === 404) {
    reason = 'not_found';
    suggestedNextAction = 'Check the username, slug, or booking identifier.';
  } else if (status === 409 && normalized.includes('conflicts with the host calendar')) {
    reason = 'calendar_conflict';
    suggestedNextAction = 'List alternate time slots for the same date.';
  } else if (status === 409 && normalized.includes('no longer available')) {
    reason = 'slot_unavailable';
    suggestedNextAction = 'Refresh availability and choose another slot.';
  } else if (status === 409 && normalized.includes('daily booking limit')) {
    reason = 'booking_limit_reached';
    suggestedNextAction = 'Look for availability on a different date.';
  } else if (status === 409 && normalized.includes('not all required hosts are available')) {
    reason = 'collective_unavailable';
    suggestedNextAction = 'Try another time when all required hosts are free.';
  } else if (status >= 500) {
    reason = 'server_error';
    suggestedNextAction = 'Retry shortly or inspect Kalendrio server logs.';
  }

  return new KalendrioApiError({
    message,
    status,
    reason,
    details: data,
    suggestedNextAction,
  });
}
