import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io'}/api/auth/callback/google`;
  const intent = req.nextUrl.searchParams.get('intent') === 'signup' ? 'signup' : 'login';

  if (!clientId) {
    // OAuth not configured — redirect back to login with error
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io';
    return NextResponse.redirect(
      new URL('/login?error=Google+sign+in+is+not+configured+yet', appUrl)
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: intent,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
