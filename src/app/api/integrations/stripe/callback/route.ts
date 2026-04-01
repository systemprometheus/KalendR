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
      new URL('/dashboard/integrations?error=Stripe+connection+cancelled', appUrl)
    );
  }

  try {
    // Exchange code for tokens via Stripe Connect OAuth
    const tokenRes = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_secret: process.env.STRIPE_SECRET_KEY!,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.stripe_user_id) {
      console.error('Stripe token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Stripe+connection+failed', appUrl)
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Session+expired', appUrl));
    }

    const existing = integrations().findFirst({
      where: { userId: user.id, provider: 'stripe' },
    });

    const data = {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
      externalId: tokens.stripe_user_id,
      email: '',
      tokenExpiry: '',
    };

    if (existing) {
      integrations().update(existing.id, data);
    } else {
      integrations().create({ userId: user.id, provider: 'stripe', ...data });
    }

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
