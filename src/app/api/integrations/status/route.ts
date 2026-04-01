import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getIntegrationProviderConfigs,
  listActiveIntegrations,
  sanitizeIntegration,
} from '@/lib/integrations';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userIntegrations = listActiveIntegrations(user.id);

    return NextResponse.json({
      integrations: userIntegrations.map(sanitizeIntegration),
      providerConfigs: getIntegrationProviderConfigs(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
