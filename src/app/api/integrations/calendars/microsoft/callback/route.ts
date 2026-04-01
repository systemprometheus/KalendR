import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { connectedCalendars } from '@/lib/db';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io';
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=Microsoft+Calendar+connection+cancelled', appUrl)
    );
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          redirect_uri: `${appUrl}/api/integrations/calendars/microsoft/callback`,
          grant_type: 'authorization_code',
          scope: 'Calendars.ReadWrite User.Read',
        }),
      }
    );

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      console.error('Microsoft Calendar token exchange failed:', tokens);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=Microsoft+Calendar+connection+failed', appUrl)
      );
    }

    // Get user profile from Microsoft Graph
    const userInfoRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const msUser = await userInfoRes.json();
    const email = msUser.mail || msUser.userPrincipalName;

    // Get current authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Session+expired', appUrl));
    }

    // Check if this Microsoft calendar is already connected
    const existing = connectedCalendars().findFirst({
      where: { userId: user.id, provider: 'microsoft', email },
    });

    if (existing) {
      connectedCalendars().update(existing.id, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || existing.refreshToken,
        tokenExpiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : existing.tokenExpiry,
      });
    } else {
      connectedCalendars().create({
        userId: user.id,
        provider: 'microsoft',
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        tokenExpiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : '',
        checkForConflicts: true,
        addEventsTo: true,
        isPrimary: connectedCalendars().count({ userId: user.id }) === 0,
      });
    }

    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=Microsoft+Calendar+connected', appUrl)
    );
  } catch (err: any) {
    console.error('Microsoft Calendar OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=Microsoft+Calendar+connection+failed', appUrl)
    );
  }
}
