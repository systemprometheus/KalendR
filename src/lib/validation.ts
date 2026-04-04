const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return EMAIL_REGEX.test(email) ? email : null;
}

export function sanitizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

export function sanitizeSlug(value: unknown, maxLength = 80): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');

  if (!normalized || !SLUG_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

export function sanitizeOptionalHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function isValidTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(value: unknown, fallback = 'America/New_York'): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed && isValidTimezone(trimmed) ? trimmed : fallback;
}

export function parseIntegerInRange(
  value: unknown,
  options: { min: number; max: number; fallback?: number | null },
): number | null {
  if (value === undefined || value === null || value === '') {
    return options.fallback ?? null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < options.min || parsed > options.max) {
    return null;
  }

  return parsed;
}

export function isValidDateTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function sanitizeEmbedSegment(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(normalized)) {
    return null;
  }
  return normalized;
}
