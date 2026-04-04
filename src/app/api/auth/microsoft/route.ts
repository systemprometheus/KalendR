import { NextRequest, NextResponse } from 'next/server';
import { findMatchingTimezone } from '@/lib/timezones';
import { cookies } from 'next/headers';
import { createOAuthState } from '@/lib/auth';
import { getAppUrl } from '@/lib/app-url';

export async function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  const appUrl = getAppUrl();
  const redirectUri = `${appUrl}/api/auth/callback/microsoft`;
  const intent = req.nextUrl.searchParams.get('intent') === 'signup' ? 'signup' : 'login';
  const timezoneParam = req.nextUrl.searchParams.get('timezone') || '';
  const timezone = timezoneParam ? findMatchingTimezone(timezoneParam) : '';
  const state = createOAuthState(intent);

  if (!clientId) {
    return NextResponse.redirect(
      new URL('/login?error=Microsoft+sign+in+is+not+configured+yet', appUrl)
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile User.Read',
    response_mode: 'query',
    state,
  });

  const cookieStore = await cookies();
  cookieStore.set('microsoft_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60,
    path: '/',
  });

  const response = NextResponse.redirect(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`
  );

  if (timezone) {
    response.cookies.set('oauth_signup_timezone', timezone, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60,
      path: '/',
    });
  }

  return response;
}
