import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

const integrations = () => db.collection<any>('integrations');

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userIntegrations = integrations().findMany({ where: { userId: user.id } });

    // Return safe data (no tokens)
    const safe = userIntegrations.map((i: any) => ({
      id: i.id,
      provider: i.provider,
      email: i.email || '',
      externalId: i.externalId || '',
      teamName: i.teamName || '',
      createdAt: i.createdAt,
    }));

    return NextResponse.json({ integrations: safe });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
