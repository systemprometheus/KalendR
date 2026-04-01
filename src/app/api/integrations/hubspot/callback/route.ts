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
      new URL('/dashboard/integrations?error=HubSpot+connection+cancelled', appUrl)
    );
  }

  try {
    const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.HUBSPOT_CLIENT_ID!,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/integrations/hubspot/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      console.error('HubSpot token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=HubSpot+connection+failed', appUrl)
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Session+expired', appUrl));
    }

    const existing = integrations().findFirst({
      where: { userId: user.id, provider: 'hubspot' },
    });

    const data = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      tokenExpiry: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : '',
      email: '',
      externalId: '',
    };

    if (existing) {
      integrations().update(existing.id, data);
    } else {
      integrations().create({ userId: user.id, provider: 'hubspot', ...data });
    }

    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=HubSpot+connected', appUrl)
    );
  } catch (err: any) {
    console.error('HubSpot OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=HubSpot+connection+failed', appUrl)
    );
  }
}
