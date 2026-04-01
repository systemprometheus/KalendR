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
      new URL('/dashboard/integrations?error=Salesforce+connection+cancelled', appUrl)
    );
  }

  try {
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
    if (!tokens.access_token) {
      console.error('Salesforce token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Salesforce+connection+failed', appUrl)
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Session+expired', appUrl));
    }

    const existing = integrations().findFirst({
      where: { userId: user.id, provider: 'salesforce' },
    });

    const data = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      externalId: tokens.id || '',
      instanceUrl: tokens.instance_url || '',
      email: '',
      tokenExpiry: '',
    };

    if (existing) {
      integrations().update(existing.id, data);
    } else {
      integrations().create({ userId: user.id, provider: 'salesforce', ...data });
    }

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
