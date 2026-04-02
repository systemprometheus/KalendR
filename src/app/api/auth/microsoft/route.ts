import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io'}/api/auth/callback/microsoft`;
  const intent = req.nextUrl.searchParams.get('intent') === 'signup' ? 'signup' : 'login';

  if (!clientId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io';
    return NextResponse.redirect(
      new URL('/login?error=Microsoft+sign+in+is+not+configured+yet', appUrl)
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile User.Read',
    response_mode: 'query',
    state: intent,
  });

  return NextResponse.redirect(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`
  );
}
