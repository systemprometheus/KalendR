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
      new URL('/dashboard/integrations?error=Slack+connection+cancelled', appUrl)
    );
  }

  try {
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/integrations/slack/callback`,
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.ok || !tokens.access_token) {
      console.error('Slack token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Slack+connection+failed', appUrl)
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Session+expired', appUrl));
    }

    const existing = integrations().findFirst({
      where: { userId: user.id, provider: 'slack' },
    });

    const data = {
      accessToken: tokens.access_token,
      refreshToken: '',
      tokenExpiry: '',
      email: '',
      externalId: tokens.team?.id || '',
      teamName: tokens.team?.name || '',
    };

    if (existing) {
      integrations().update(existing.id, data);
    } else {
      integrations().create({ userId: user.id, provider: 'slack', ...data });
    }

    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=Slack+connected', appUrl)
    );
  } catch (err: any) {
    console.error('Slack OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=Slack+connection+failed', appUrl)
    );
  }
}
