import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { users } from '@/lib/db';
import { createSession, generateSlug } from '@/lib/auth';
import { ensureUserWorkspace } from '@/lib/default-user-setup';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const intent = req.nextUrl.searchParams.get('state') === 'signup' ? 'signup' : 'login';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io';

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=Google+authentication+cancelled', appUrl));
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/callback/google`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      console.error('Google token exchange failed:', tokens);
      return NextResponse.redirect(new URL('/login?error=Google+authentication+failed', appUrl));
    }

    // Get user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const googleUser = await userInfoRes.json();

    if (!googleUser.email) {
      return NextResponse.redirect(new URL('/login?error=Could+not+get+email+from+Google', appUrl));
    }

    const normalizedEmail = String(googleUser.email).toLowerCase();

    // Find or create user
    let user = users().findFirst({ where: { email: normalizedEmail } });
    const isNewUser = !user;

    if (!user) {
      // Create new user
      const name = googleUser.name || normalizedEmail.split('@')[0];
      user = users().create({
        email: normalizedEmail,
        name,
        slug: generateSlug(name),
        passwordHash: '', // No password for OAuth users
        timezone: 'America/New_York',
        plan: 'free',
        onboardingComplete: false,
        googleId: googleUser.id,
        avatarUrl: googleUser.picture || '',
      });
    } else if (!user.googleId) {
      // Link Google account to existing user
      user = users().update(user.id, {
        googleId: googleUser.id,
        avatarUrl: user.avatarUrl || googleUser.picture || '',
      }) || user;
    }

    user = ensureUserWorkspace(user);

    // Create session
    const sessionToken = await createSession(user.id);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    if (intent === 'signup' && (isNewUser || !user.onboardingComplete)) {
      return NextResponse.redirect(new URL('/onboarding', appUrl));
    }

    return NextResponse.redirect(new URL('/dashboard', appUrl));
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(new URL('/login?error=Authentication+failed', appUrl));
  }
}
