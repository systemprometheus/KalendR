import { sanitizeOptionalHttpUrl } from './validation';

const DEFAULT_PRODUCTION_APP_URL = 'https://kalendr.io';
const DEFAULT_LOCAL_APP_URL = 'http://localhost:3000';

export function getAppUrl() {
  const configured = sanitizeOptionalHttpUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const fallback = process.env.NODE_ENV === 'production'
    ? DEFAULT_PRODUCTION_APP_URL
    : DEFAULT_LOCAL_APP_URL;

  return fallback;
}
