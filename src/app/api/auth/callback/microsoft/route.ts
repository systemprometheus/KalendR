import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { users } from '@/lib/db';
import { createSession, generateSlug } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io';
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=Microsoft+authentication+cancelled', req.url));
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
      return NextResponse.redirect(new URL('/login?error=Microsoft+authentication+failed', req.url));
    }

    // Get user info from Microsoft Graph
    const userInfoRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const msUser = await userInfoRes.json();
    const email = msUser.mail || msUser.userPrincipalName;

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=Could+not+get+email+from+Microsoft', req.url));
    }

    // Find or create user
    let user = users().findFirst({ where: { email } });

    if (!user) {
      const name = msUser.displayName || email.split('@')[0];
      user = users().create({
        email,
        name,
        slug: generateSlug(name),
        passwordHash: '',
        timezone: 'America/New_York',
        plan: 'free',
        onboardingComplete: false,
        microsoftId: msUser.id,
        avatarUrl: '',
      });
    } else if (!user.microsoftId) {
      users().update(user.id, { microsoftId: msUser.id });
    }

    // Create session
    const sessionToken = await createSession(user.id);

    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    if (!user.onboardingComplete) {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    return NextResponse.redirect(new URL('/dashboard', req.url));
  } catch (err: any) {
    console.error('Microsoft OAuth callback error:', err);
    return NextResponse.redirect(new URL('/login?error=Authentication+failed', req.url));
  }
}
