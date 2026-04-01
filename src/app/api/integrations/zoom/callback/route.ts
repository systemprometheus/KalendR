import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getZoomOAuthConfig } from '@/lib/zoom';

const integrations = () => db.collection<any>('integrations');

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io';

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=Zoom+connection+cancelled', appUrl)
    );
  }

  try {
    const config = getZoomOAuthConfig();
    if (!config.configured) {
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(`Zoom credentials missing: ${config.missing.join(', ')}`)}`, appUrl)
      );
    }

    const clientId = config.clientId;
    const clientSecret = config.clientSecret;
    const redirectUri = `${appUrl}/api/integrations/zoom/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      console.error('Zoom token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Zoom+connection+failed', appUrl)
      );
    }

    // Get user info
    const userRes = await fetch('https://api.zoom.us/v2/users/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const zoomUser = await userRes.json();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Session+expired', appUrl));
    }

    // Upsert integration
    const existing = integrations().findFirst({
      where: { userId: user.id, provider: 'zoom' },
    });

    const data = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      tokenExpiry: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : '',
      email: zoomUser.email || '',
      externalId: zoomUser.id || '',
    };

    if (existing) {
      integrations().update(existing.id, data);
    } else {
      integrations().create({ userId: user.id, provider: 'zoom', ...data });
    }

    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=Zoom+connected', appUrl)
    );
  } catch (err: any) {
    console.error('Zoom OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=Zoom+connection+failed', appUrl)
    );
  }
}
