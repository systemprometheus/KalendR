import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { buildGoogleCalendarOAuthUrl } from '@/lib/google-calendar';
import { buildIntegrationState, getAppUrl } from '@/lib/integrations';
import { buildZoomOAuthUrl, getZoomOAuthConfig } from '@/lib/zoom';

// Central integration connect endpoint - generates OAuth URLs for all providers
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { provider } = await req.json();
    const baseUrl = getAppUrl(req);
    const state = buildIntegrationState(user.id, provider);

    switch (provider) {
      case 'google': {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return notConfigured('Google Calendar', missingEnvVars({
            GOOGLE_CLIENT_ID: clientId,
            GOOGLE_CLIENT_SECRET: clientSecret,
          }));
        }

        return NextResponse.json({ url: buildGoogleCalendarOAuthUrl(baseUrl, clientId) });
      }

      case 'microsoft': {
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return notConfigured('Microsoft Outlook', missingEnvVars({
            MICROSOFT_CLIENT_ID: clientId,
            MICROSOFT_CLIENT_SECRET: clientSecret,
          }));
        }

        const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
        const redirectUri = `${baseUrl}/api/integrations/calendars/microsoft/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'Calendars.ReadWrite User.Read openid email profile',
          response_mode: 'query',
          state,
        });
        return NextResponse.json({
          url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`,
        });
      }

      case 'zoom': {
        const config = getZoomOAuthConfig();
        if (!config.configured) {
          return notConfigured('Zoom', config.missing);
        }

        return NextResponse.json({ url: buildZoomOAuthUrl(baseUrl, config.clientId) });
      }

      case 'google_meet': {
        return NextResponse.json(
          {
            error: 'Google Meet is configured through Google Calendar',
            message: 'Connect Google Calendar and choose an add-to calendar to create Meet links automatically.',
            stubbed: true,
          },
          { status: 501 },
        );
      }

      case 'stripe': {
        const clientId = process.env.STRIPE_CLIENT_ID;
        const clientSecret = process.env.STRIPE_SECRET_KEY;
        if (!clientId || !clientSecret) {
          return notConfigured('Stripe', missingEnvVars({
            STRIPE_CLIENT_ID: clientId,
            STRIPE_SECRET_KEY: clientSecret,
          }));
        }

        const redirectUri = `${baseUrl}/api/integrations/stripe/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'read_write',
          state,
        });
        return NextResponse.json({ url: `https://connect.stripe.com/oauth/authorize?${params}` });
      }

      case 'salesforce': {
        const clientId = process.env.SALESFORCE_CLIENT_ID;
        const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return notConfigured('Salesforce', missingEnvVars({
            SALESFORCE_CLIENT_ID: clientId,
            SALESFORCE_CLIENT_SECRET: clientSecret,
          }));
        }

        const redirectUri = `${baseUrl}/api/integrations/salesforce/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'api refresh_token',
          state,
        });
        return NextResponse.json({ url: `https://login.salesforce.com/services/oauth2/authorize?${params}` });
      }

      case 'hubspot': {
        const clientId = process.env.HUBSPOT_CLIENT_ID;
        const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return notConfigured('HubSpot', missingEnvVars({
            HUBSPOT_CLIENT_ID: clientId,
            HUBSPOT_CLIENT_SECRET: clientSecret,
          }));
        }

        const redirectUri = `${baseUrl}/api/integrations/hubspot/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: 'oauth crm.objects.contacts.read crm.objects.contacts.write',
          state,
        });
        return NextResponse.json({ url: `https://app.hubspot.com/oauth/authorize?${params}` });
      }

      case 'slack': {
        const clientId = process.env.SLACK_CLIENT_ID;
        const clientSecret = process.env.SLACK_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return notConfigured('Slack', missingEnvVars({
            SLACK_CLIENT_ID: clientId,
            SLACK_CLIENT_SECRET: clientSecret,
          }));
        }

        const redirectUri = `${baseUrl}/api/integrations/slack/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: 'chat:write chat:write.public channels:read',
          state,
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

function missingEnvVars(required: Record<string, string | undefined>) {
  return Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function notConfigured(name: string, missing: string[]) {
  const missingList = missing.length > 0 ? missing.join(', ') : 'required credentials';
  return NextResponse.json(
    {
      error: `${name} integration not configured`,
      message: `Missing environment variables: ${missingList}. Add them to the server config and restart the app.`,
      missing,
      stubbed: true,
    },
    { status: 501 }
  );
}
