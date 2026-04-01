import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAppUrl, isValidIntegrationState, upsertIntegration } from '@/lib/integrations';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const state = req.nextUrl.searchParams.get('state');
  const appUrl = getAppUrl(req);

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=HubSpot+connection+cancelled', appUrl)
    );
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Session+expired', appUrl));
    }

    if (!isValidIntegrationState(state, 'hubspot', user.id)) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=HubSpot+connection+could+not+be+verified', appUrl)
      );
    }

    const tokenRes = await fetch('https://api.hubspot.com/oauth/2026-03/token', {
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
    if (!tokenRes.ok || !tokens.access_token) {
      console.error('HubSpot token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=HubSpot+connection+failed', appUrl)
      );
    }

    upsertIntegration(user.id, 'hubspot', {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      tokenExpiry: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : '',
      email: '',
      externalId: tokens.hub_id ? String(tokens.hub_id) : '',
      displayName: tokens.hub_id ? `Hub ID ${tokens.hub_id}` : 'HubSpot account',
      scope: Array.isArray(tokens.scopes) ? tokens.scopes.join(' ') : (tokens.scope || ''),
      metadata: {
        hubId: tokens.hub_id ? String(tokens.hub_id) : '',
      },
    });

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
