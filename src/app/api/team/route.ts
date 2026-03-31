import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { teams, teamMembers, users } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!user.organizationId) return NextResponse.json({ teams: [] });

    const orgTeams = teams().findMany({ where: { organizationId: user.organizationId } });

    const teamsWithMembers = orgTeams.map((t: any) => {
      const members = teamMembers().findMany({ where: { teamId: t.id } });
      const enrichedMembers = members.map((m: any) => {
        const memberUser = users().findById(m.userId);
        return {
          ...m,
          user: memberUser ? { id: memberUser.id, name: memberUser.name, email: memberUser.email, avatarUrl: memberUser.avatarUrl } : null,
        };
      });
      return { ...t, members: enrichedMembers };
    });

    return NextResponse.json({ teams: teamsWithMembers });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });
    if (user.orgRole !== 'owner' && user.orgRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Team name is required' }, { status: 400 });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const team = teams().create({
      name,
      slug,
      organizationId: user.organizationId,
    });

    // Add creator as admin member
    teamMembers().create({
      teamId: team.id,
      userId: user.id,
      role: 'admin',
      priority: 0,
      weight: 1.0,
      active: true,
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
