import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// Central integration connect endpoint - generates OAuth URLs for all providers
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { provider } = await req.json();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io';

    switch (provider) {
      case 'google': {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) return notConfigured('Google Calendar', 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');

        const redirectUri = `${baseUrl}/api/integrations/calendars/google/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email',
          access_type: 'offline',
          prompt: 'consent',
        });
        return NextResponse.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
      }

      case 'microsoft': {
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        if (!clientId) return notConfigured('Microsoft Outlook', 'MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET');

        const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
        const redirectUri = `${baseUrl}/api/integrations/calendars/microsoft/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'Calendars.ReadWrite User.Read openid email profile',
          response_mode: 'query',
        });
        return NextResponse.json({
          url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`,
        });
      }

      case 'zoom': {
        const clientId = process.env.ZOOM_CLIENT_ID;
        if (!clientId) return notConfigured('Zoom', 'ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET');

        const redirectUri = `${baseUrl}/api/integrations/zoom/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
        });
        return NextResponse.json({ url: `https://zoom.us/oauth/authorize?${params}` });
      }

      case 'google_meet': {
        // Google Meet uses Google Calendar API - same OAuth flow but with meet scope
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) return notConfigured('Google Meet', 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');

        const redirectUri = `${baseUrl}/api/integrations/google-meet/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
          access_type: 'offline',
          prompt: 'consent',
        });
        return NextResponse.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
      }

      case 'stripe': {
        const clientId = process.env.STRIPE_CLIENT_ID;
        if (!clientId) return notConfigured('Stripe', 'STRIPE_CLIENT_ID and STRIPE_SECRET_KEY');

        const redirectUri = `${baseUrl}/api/integrations/stripe/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'read_write',
        });
        return NextResponse.json({ url: `https://connect.stripe.com/oauth/authorize?${params}` });
      }

      case 'salesforce': {
        const clientId = process.env.SALESFORCE_CLIENT_ID;
        if (!clientId) return notConfigured('Salesforce', 'SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET');

        const redirectUri = `${baseUrl}/api/integrations/salesforce/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
        });
        return NextResponse.json({ url: `https://login.salesforce.com/services/oauth2/authorize?${params}` });
      }

      case 'hubspot': {
        const clientId = process.env.HUBSPOT_CLIENT_ID;
        if (!clientId) return notConfigured('HubSpot', 'HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET');

        const redirectUri = `${baseUrl}/api/integrations/hubspot/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          redirect_uri: redirectUri,
          scope: 'crm.objects.contacts.read crm.objects.contacts.write',
        });
        return NextResponse.json({ url: `https://app.hubspot.com/oauth/authorize?${params}` });
      }

      case 'slack': {
        const clientId = process.env.SLACK_CLIENT_ID;
        if (!clientId) return notConfigured('Slack', 'SLACK_CLIENT_ID and SLACK_CLIENT_SECRET');

        const redirectUri = `${baseUrl}/api/integrations/slack/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: 'chat:write channels:read',
          user_scope: 'identity.basic',
        });
        return NextResponse.json({ url: `https://slack.com/oauth/v2/authorize?${params}` });
      }

      default:
        return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }
  } catch (error) {
    console.error('Integration connect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function notConfigured(name: string, envVars: string) {
  return NextResponse.json(
    {
      error: `${name} integration not configured`,
      message: `Set ${envVars} in environment variables`,
      stubbed: true,
    },
    { status: 501 }
  );
}
