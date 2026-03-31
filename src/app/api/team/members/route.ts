import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { users, organizations } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!user.organizationId) return NextResponse.json({ members: [] });

    const members = users().findMany({ where: { organizationId: user.organizationId } });

    const safeMembers = members.map((m: any) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      avatarUrl: m.avatarUrl,
      orgRole: m.orgRole,
      timezone: m.timezone,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({ members: safeMembers });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
