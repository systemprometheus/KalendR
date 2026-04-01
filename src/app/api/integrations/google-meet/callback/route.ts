import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

const integrations = () => db.collection<any>('integrations');

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io';

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=Google+Meet+connection+cancelled', appUrl)
    );
  }

  try {
    // Exchange code for tokens (uses same Google OAuth as calendar)
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/integrations/google-meet/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      console.error('Google Meet token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Google+Meet+connection+failed', appUrl)
      );
    }

    // Get user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userInfoRes.json();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Session+expired', appUrl));
    }

    const existing = integrations().findFirst({
      where: { userId: user.id, provider: 'google_meet' },
    });

    const data = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      tokenExpiry: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : '',
      email: googleUser.email || '',
      externalId: googleUser.id || '',
    };

    if (existing) {
      integrations().update(existing.id, data);
    } else {
      integrations().create({ userId: user.id, provider: 'google_meet', ...data });
    }

    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=Google+Meet+connected', appUrl)
    );
  } catch (err: any) {
    console.error('Google Meet OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=Google+Meet+connection+failed', appUrl)
    );
  }
}
