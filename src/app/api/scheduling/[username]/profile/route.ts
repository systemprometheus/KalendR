import { NextRequest, NextResponse } from 'next/server';
import { users, eventTypes } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;

    const user = users().findFirst({ where: { slug: username } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const ets = eventTypes().findMany({
      where: { userId: user.id, isActive: true, isArchived: false },
    });

    return NextResponse.json({
      user: {
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        welcomeMessage: user.welcomeMessage,
      },
      eventTypes: ets.map((et: any) => ({
        id: et.id,
        title: et.title,
        slug: et.slug,
        description: et.description,
        duration: et.duration,
        color: et.color,
        locationType: et.locationType,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
