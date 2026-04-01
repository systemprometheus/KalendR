import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { integrations } from '@/lib/db';
import {
  disconnectIntegration,
  fetchSlackChannels,
  getActiveIntegration,
  getUsableIntegration,
  sanitizeIntegration,
} from '@/lib/integrations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const integration = getActiveIntegration(user.id, provider);
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const usableIntegration = await getUsableIntegration(integration);

    if (provider === 'slack') {
      const channels = await fetchSlackChannels(usableIntegration.accessToken).catch(() => []);
      return NextResponse.json({
        integration: sanitizeIntegration(usableIntegration),
        channels,
      });
    }

    return NextResponse.json({ integration: sanitizeIntegration(usableIntegration) });
  } catch (error) {
    console.error('Integration details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const integration = getActiveIntegration(user.id, provider);
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const body = await req.json();

    if (provider === 'slack') {
      if (!body.defaultChannelId || !body.defaultChannelName) {
        return NextResponse.json({ error: 'Channel selection is required' }, { status: 400 });
      }

      const record = integrations().update(integration.id, {
        settings: {
          ...(integration.settings || {}),
          defaultChannelId: body.defaultChannelId,
          defaultChannelName: body.defaultChannelName,
        },
      });

      return NextResponse.json({ integration: sanitizeIntegration(record as any) });
    }

    return NextResponse.json({ error: 'Nothing to update for this provider' }, { status: 400 });
  } catch (error) {
    console.error('Integration update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const integration = getActiveIntegration(user.id, provider);
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    disconnectIntegration(integration.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Integration disconnect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
