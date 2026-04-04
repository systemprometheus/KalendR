import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { users } from '@/lib/db';
import { createSession, generateSlug } from '@/lib/auth';
import { ensureUserWorkspace } from '@/lib/default-user-setup';
import { findMatchingTimezone } from '@/lib/timezones';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const intent = req.nextUrl.searchParams.get('state') === 'signup' ? 'signup' : 'login';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io';
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  const cookieStore = await cookies();
  const signupTimezone = findMatchingTimezone(cookieStore.get('oauth_signup_timezone')?.value || 'America/New_York');

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=Microsoft+authentication+cancelled', appUrl));
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/callback/microsoft`,
        grant_type: 'authorization_code',
        scope: 'openid email profile User.Read',
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      console.error('Microsoft token exchange failed:', tokens);
      return NextResponse.redirect(new URL('/login?error=Microsoft+authentication+failed', appUrl));
    }

    // Get user info from Microsoft Graph
    const userInfoRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const msUser = await userInfoRes.json();
    const email = msUser.mail || msUser.userPrincipalName;

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=Could+not+get+email+from+Microsoft', appUrl));
    }

    const normalizedEmail = String(email).toLowerCase();

    // Find or create user
    let user = users().findFirst({ where: { email: normalizedEmail } });
    const isNewUser = !user;

    if (!user) {
      const name = msUser.displayName || normalizedEmail.split('@')[0];
      user = users().create({
        email: normalizedEmail,
        name,
        slug: generateSlug(name),
        passwordHash: '',
        timezone: signupTimezone,
        plan: 'free',
        onboardingComplete: false,
        microsoftId: msUser.id,
        avatarUrl: '',
      });
    } else if (!user.microsoftId) {
      user = users().update(user.id, { microsoftId: msUser.id }) || user;
    }

    user = ensureUserWorkspace(user);

    // Create session
    const sessionToken = await createSession(user.id);

    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });
    cookieStore.delete('oauth_signup_timezone');

    if (intent === 'signup' && (isNewUser || !user.onboardingComplete)) {
      return NextResponse.redirect(new URL('/onboarding', appUrl));
    }

    return NextResponse.redirect(new URL('/dashboard', appUrl));
  } catch (err: any) {
    console.error('Microsoft OAuth callback error:', err);
    return NextResponse.redirect(new URL('/login?error=Authentication+failed', appUrl));
  }
}
