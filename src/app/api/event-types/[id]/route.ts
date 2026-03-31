import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { eventTypes, eventTypeHosts, bookings } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const et = eventTypes().findById(id);
    if (!et || et.userId !== user.id) {
      return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
    }

    const hosts = eventTypeHosts().findMany({ where: { eventTypeId: id } });

    return NextResponse.json({ eventType: et, hosts });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const et = eventTypes().findById(id);
    if (!et || et.userId !== user.id) {
      return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
    }

    const body = await req.json();

    // If updating slug, check uniqueness
    if (body.slug && body.slug !== et.slug) {
      const existing = eventTypes().findFirst({ where: { userId: user.id, slug: body.slug } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'This slug is already in use' }, { status: 409 });
      }
    }

    // Update hosts if provided
    if (body.hosts && Array.isArray(body.hosts)) {
      eventTypeHosts().deleteMany({ eventTypeId: id });
      for (const host of body.hosts) {
        eventTypeHosts().create({
          eventTypeId: id,
          userId: host.userId,
          isRequired: host.isRequired ?? false,
          priority: host.priority ?? 0,
        });
      }
      delete body.hosts;
    }

    // Handle JSON fields
    if (body.customQuestions && typeof body.customQuestions !== 'string') {
      body.customQuestions = JSON.stringify(body.customQuestions);
    }
    if (body.durationOptions && typeof body.durationOptions !== 'string') {
      body.durationOptions = JSON.stringify(body.durationOptions);
    }

    const updated = eventTypes().update(id, body);
    return NextResponse.json({ eventType: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const et = eventTypes().findById(id);
    if (!et || et.userId !== user.id) {
      return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
    }

    // Soft delete - archive instead
    eventTypes().update(id, { isArchived: true, isActive: false });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
