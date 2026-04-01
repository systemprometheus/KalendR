import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAppUrl, isValidIntegrationState, upsertIntegration } from '@/lib/integrations';

async function fetchStripeAccountSummary(accessToken: string) {
  const response = await fetch('https://api.stripe.com/v1/account', {
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
      new URL('/dashboard/integrations?error=Stripe+connection+cancelled', appUrl)
    );
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Session+expired', appUrl));
    }

    if (!isValidIntegrationState(state, 'stripe', user.id)) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Stripe+connection+could+not+be+verified', appUrl)
      );
    }

    // Exchange code for tokens via Stripe Connect OAuth
    const tokenRes = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_secret: process.env.STRIPE_SECRET_KEY!,
        grant_type: 'authorization_code',
        redirect_uri: `${appUrl}/api/integrations/stripe/callback`,
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.stripe_user_id) {
      console.error('Stripe token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Stripe+connection+failed', appUrl)
      );
    }

    const account = await fetchStripeAccountSummary(tokens.access_token).catch(() => null);

    upsertIntegration(user.id, 'stripe', {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
      externalId: tokens.stripe_user_id,
      email: account?.email || '',
      displayName:
        account?.business_profile?.name ||
        account?.settings?.dashboard?.display_name ||
        tokens.stripe_user_id,
      scope: tokens.scope || 'read_write',
      tokenExpiry: '',
      metadata: {
        livemode: Boolean(tokens.livemode),
        country: account?.country || '',
      },
    });

    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=Stripe+connected', appUrl)
    );
  } catch (err: any) {
    console.error('Stripe OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=Stripe+connection+failed', appUrl)
    );
  }
}
