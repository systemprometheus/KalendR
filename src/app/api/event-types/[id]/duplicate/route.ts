import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { eventTypes, eventTypeHosts } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const original = eventTypes().findById(id);
    if (!original || original.userId !== user.id) {
      return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
    }

    const { id: _, createdAt, updatedAt, ...rest } = original;
    const newSlug = `${original.slug}-copy-${randomBytes(3).toString('hex')}`;

    const duplicate = eventTypes().create({
      ...rest,
      title: `${original.title} (Copy)`,
      slug: newSlug,
    });

    // Copy hosts
    const hosts = eventTypeHosts().findMany({ where: { eventTypeId: id } });
    for (const host of hosts) {
      eventTypeHosts().create({
        eventTypeId: duplicate.id,
        userId: host.userId,
        isRequired: host.isRequired,
        priority: host.priority,
      });
    }

    return NextResponse.json({ eventType: duplicate }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
