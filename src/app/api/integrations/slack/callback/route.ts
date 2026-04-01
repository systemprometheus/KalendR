import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  fetchSlackChannels,
  getAppUrl,
  isValidIntegrationState,
  upsertIntegration,
} from '@/lib/integrations';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const state = req.nextUrl.searchParams.get('state');
  const appUrl = getAppUrl(req);

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=Slack+connection+cancelled', appUrl)
    );
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Session+expired', appUrl));
    }

    if (!isValidIntegrationState(state, 'slack', user.id)) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Slack+connection+could+not+be+verified', appUrl)
      );
    }

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
    if (!tokenRes.ok || !tokens.ok || !tokens.access_token) {
      console.error('Slack token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Slack+connection+failed', appUrl)
      );
    }

    const channels = await fetchSlackChannels(tokens.access_token).catch(() => []);
    const defaultChannel =
      channels.find((channel) => channel.name === 'general') ||
      channels[0] ||
      null;

    upsertIntegration(user.id, 'slack', {
      accessToken: tokens.access_token,
      refreshToken: '',
      tokenExpiry: '',
      email: '',
      displayName: tokens.team?.name || '',
      externalId: tokens.team?.id || '',
      teamName: tokens.team?.name || '',
      scope: tokens.scope || '',
      settings: {
        defaultChannelId: defaultChannel?.id || '',
        defaultChannelName: defaultChannel?.name || '',
      },
      metadata: {
        appId: tokens.app_id || '',
      },
    });

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
