import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { syncGoogleCalendarsFromOAuth } from '@/lib/google-calendar';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io';

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=Google+Calendar+connection+cancelled', appUrl)
    );
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
        redirect_uri: `${appUrl}/api/integrations/calendars/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      console.error('Google Calendar token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Google+Calendar+connection+failed', appUrl)
      );
    }

    // Get the user's Google profile/email for this calendar
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userInfoRes.json();
    const providerAccountId = googleUser.id || googleUser.email;

    if (!googleUser.email || !providerAccountId) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Google+Calendar+account+details+were+missing', appUrl)
      );
    }

    // Get current authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Session+expired', appUrl));
    }

    await syncGoogleCalendarsFromOAuth({
      userId: user.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiresIn: tokens.expires_in,
      accountEmail: googleUser.email,
      accountExternalId: providerAccountId,
    });

    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=Google+Calendar+connected', appUrl)
    );
  } catch (err: any) {
    console.error('Google Calendar OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=Google+Calendar+connection+failed', appUrl)
    );
  }
}
