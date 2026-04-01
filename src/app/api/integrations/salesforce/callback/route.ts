import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAppUrl, isValidIntegrationState, upsertIntegration } from '@/lib/integrations';

async function fetchSalesforceIdentity(accessToken: string, identityUrl?: string) {
  if (!identityUrl) return null;

  const response = await fetch(identityUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const state = req.nextUrl.searchParams.get('state');
  const appUrl = getAppUrl(req);

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=Salesforce+connection+cancelled', appUrl)
    );
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Session+expired', appUrl));
    }

    if (!isValidIntegrationState(state, 'salesforce', user.id)) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Salesforce+connection+could+not+be+verified', appUrl)
      );
    }

    const tokenRes = await fetch('https://login.salesforce.com/services/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.SALESFORCE_CLIENT_ID!,
        client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/integrations/salesforce/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      console.error('Salesforce token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Salesforce+connection+failed', appUrl)
      );
    }

    const identity = await fetchSalesforceIdentity(tokens.access_token, tokens.id).catch(() => null);

    upsertIntegration(user.id, 'salesforce', {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      externalId: identity?.user_id || tokens.id || '',
      instanceUrl: tokens.instance_url || '',
      email: identity?.email || '',
      displayName: identity?.display_name || identity?.username || '',
      scope: 'api refresh_token',
      tokenExpiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      metadata: {
        organizationId: identity?.organization_id || '',
      },
    });

    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=Salesforce+connected', appUrl)
    );
  } catch (err: any) {
    console.error('Salesforce OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=Salesforce+connection+failed', appUrl)
    );
  }
}
