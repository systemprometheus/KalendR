/**
 * Shared timezone definitions used across the entire app.
 * Single source of truth — onboarding, settings, availability, booking pages all import from here.
 */

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

export const TIMEZONES: TimezoneOption[] = [
  // Americas
  { value: 'Pacific/Honolulu', label: 'Hawaii', offset: 'HST (UTC-10)' },
  { value: 'America/Anchorage', label: 'Alaska', offset: 'AKST (UTC-9)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)', offset: 'PST (UTC-8)' },
  { value: 'America/Phoenix', label: 'Arizona', offset: 'MST (UTC-7)' },
  { value: 'America/Denver', label: 'Mountain Time (US)', offset: 'MST (UTC-7)' },
  { value: 'America/Chicago', label: 'Central Time (US)', offset: 'CST (UTC-6)' },
  { value: 'America/New_York', label: 'Eastern Time (US)', offset: 'EST (UTC-5)' },
  { value: 'America/Halifax', label: 'Atlantic Time (Canada)', offset: 'AST (UTC-4)' },
  { value: 'America/St_Johns', label: 'Newfoundland', offset: 'NST (UTC-3:30)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo', offset: 'BRT (UTC-3)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires', offset: 'ART (UTC-3)' },
  { value: 'America/Mexico_City', label: 'Mexico City', offset: 'CST (UTC-6)' },
  { value: 'America/Bogota', label: 'Bogotá', offset: 'COT (UTC-5)' },
  { value: 'America/Lima', label: 'Lima', offset: 'PET (UTC-5)' },
  { value: 'America/Toronto', label: 'Toronto', offset: 'EST (UTC-5)' },
  { value: 'America/Vancouver', label: 'Vancouver', offset: 'PST (UTC-8)' },

  // Europe
  { value: 'Atlantic/Reykjavik', label: 'Reykjavik', offset: 'GMT (UTC+0)' },
  { value: 'Europe/London', label: 'London', offset: 'GMT (UTC+0)' },
  { value: 'Europe/Dublin', label: 'Dublin', offset: 'GMT (UTC+0)' },
  { value: 'Europe/Lisbon', label: 'Lisbon', offset: 'WET (UTC+0)' },
  { value: 'Europe/Paris', label: 'Paris', offset: 'CET (UTC+1)' },
  { value: 'Europe/Berlin', label: 'Berlin', offset: 'CET (UTC+1)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam', offset: 'CET (UTC+1)' },
  { value: 'Europe/Madrid', label: 'Madrid', offset: 'CET (UTC+1)' },
  { value: 'Europe/Rome', label: 'Rome', offset: 'CET (UTC+1)' },
  { value: 'Europe/Zurich', label: 'Zurich', offset: 'CET (UTC+1)' },
  { value: 'Europe/Stockholm', label: 'Stockholm', offset: 'CET (UTC+1)' },
  { value: 'Europe/Warsaw', label: 'Warsaw', offset: 'CET (UTC+1)' },
  { value: 'Europe/Athens', label: 'Athens', offset: 'EET (UTC+2)' },
  { value: 'Europe/Bucharest', label: 'Bucharest', offset: 'EET (UTC+2)' },
  { value: 'Europe/Helsinki', label: 'Helsinki', offset: 'EET (UTC+2)' },
  { value: 'Europe/Istanbul', label: 'Istanbul', offset: 'TRT (UTC+3)' },
  { value: 'Europe/Moscow', label: 'Moscow', offset: 'MSK (UTC+3)' },
  { value: 'Europe/Kiev', label: 'Kyiv', offset: 'EET (UTC+2)' },

  // Africa
  { value: 'Africa/Cairo', label: 'Cairo', offset: 'EET (UTC+2)' },
  { value: 'Africa/Lagos', label: 'Lagos', offset: 'WAT (UTC+1)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg', offset: 'SAST (UTC+2)' },
  { value: 'Africa/Nairobi', label: 'Nairobi', offset: 'EAT (UTC+3)' },
  { value: 'Africa/Casablanca', label: 'Casablanca', offset: 'WET (UTC+0)' },

  // Middle East
  { value: 'Asia/Dubai', label: 'Dubai', offset: 'GST (UTC+4)' },
  { value: 'Asia/Riyadh', label: 'Riyadh', offset: 'AST (UTC+3)' },
  { value: 'Asia/Tehran', label: 'Tehran', offset: 'IRST (UTC+3:30)' },
  { value: 'Asia/Jerusalem', label: 'Jerusalem', offset: 'IST (UTC+2)' },

  // Asia
  { value: 'Asia/Karachi', label: 'Karachi', offset: 'PKT (UTC+5)' },
  { value: 'Asia/Kolkata', label: 'Mumbai / New Delhi', offset: 'IST (UTC+5:30)' },
  { value: 'Asia/Colombo', label: 'Colombo', offset: 'IST (UTC+5:30)' },
  { value: 'Asia/Dhaka', label: 'Dhaka', offset: 'BST (UTC+6)' },
  { value: 'Asia/Bangkok', label: 'Bangkok', offset: 'ICT (UTC+7)' },
  { value: 'Asia/Jakarta', label: 'Jakarta', offset: 'WIB (UTC+7)' },
  { value: 'Asia/Singapore', label: 'Singapore', offset: 'SGT (UTC+8)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', offset: 'HKT (UTC+8)' },
  { value: 'Asia/Shanghai', label: 'Shanghai', offset: 'CST (UTC+8)' },
  { value: 'Asia/Taipei', label: 'Taipei', offset: 'CST (UTC+8)' },
  { value: 'Asia/Seoul', label: 'Seoul', offset: 'KST (UTC+9)' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: 'JST (UTC+9)' },

  // Oceania
  { value: 'Australia/Perth', label: 'Perth', offset: 'AWST (UTC+8)' },
  { value: 'Australia/Adelaide', label: 'Adelaide', offset: 'ACST (UTC+9:30)' },
  { value: 'Australia/Sydney', label: 'Sydney', offset: 'AEST (UTC+10)' },
  { value: 'Australia/Melbourne', label: 'Melbourne', offset: 'AEST (UTC+10)' },
  { value: 'Australia/Brisbane', label: 'Brisbane', offset: 'AEST (UTC+10)' },
  { value: 'Pacific/Auckland', label: 'Auckland', offset: 'NZST (UTC+12)' },
  { value: 'Pacific/Fiji', label: 'Fiji', offset: 'FJT (UTC+12)' },

  // UTC
  { value: 'UTC', label: 'UTC', offset: 'UTC (UTC+0)' },
];

/**
 * Find the best matching timezone from our list for a browser-detected IANA timezone.
 * Falls back to the exact value if it exists in our list, or 'America/New_York' as default.
 */
export function findMatchingTimezone(browserTimezone: string): string {
  // Direct match
  const direct = TIMEZONES.find(tz => tz.value === browserTimezone);
  if (direct) return direct.value;

  // Try matching by region prefix (e.g., "America/Indiana/Indianapolis" → "America/New_York")
  // This handles obscure IANA aliases
  const region = browserTimezone.split('/')[0];
  const regionMatch = TIMEZONES.find(tz => tz.value.startsWith(region + '/'));
  if (regionMatch) return regionMatch.value;

  return 'America/New_York';
}

/**
 * Format a timezone for display: "Eastern Time (US) — EST (UTC-5)"
 */
export function formatTimezoneLabel(tz: TimezoneOption): string {
  return `${tz.label} — ${tz.offset}`;
}

/**
 * Get a TimezoneOption by value, or return a fallback.
 */
export function getTimezone(value: string): TimezoneOption {
  return TIMEZONES.find(tz => tz.value === value) || { value, label: value, offset: '' };
}
