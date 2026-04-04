import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { eventTypes, eventTypeHosts, bookings } from '@/lib/db';
import {
  parseIntegerInRange,
  sanitizeOptionalHttpUrl,
  sanitizeSlug,
  sanitizeText,
} from '@/lib/validation';

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
      body.slug = sanitizeSlug(body.slug);
      if (!body.slug) {
        return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
      }
      const existing = eventTypes().findFirst({ where: { userId: user.id, slug: body.slug } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'This slug is already in use' }, { status: 409 });
      }
    }

    if (body.title !== undefined) {
      body.title = sanitizeText(body.title, 120);
      if (!body.title) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }
    }

    if (body.description !== undefined) body.description = sanitizeText(body.description, 2000) || '';
    if (body.locationValue !== undefined) body.locationValue = sanitizeText(body.locationValue, 500);
    if (body.confirmationMessage !== undefined) body.confirmationMessage = sanitizeText(body.confirmationMessage, 2000);
    if (body.redirectUrl !== undefined) body.redirectUrl = sanitizeOptionalHttpUrl(body.redirectUrl);

    const boundedNumberFields: Array<[string, { min: number; max: number; fallback?: number | null }]> = [
      ['duration', { min: 5, max: 720 }],
      ['minNotice', { min: 0, max: 60 * 24 * 30 }],
      ['maxFutureDays', { min: 1, max: 365 }],
      ['slotInterval', { min: 5, max: 720, fallback: null }],
      ['bufferBefore', { min: 0, max: 1440 }],
      ['bufferAfter', { min: 0, max: 1440 }],
      ['dailyLimit', { min: 1, max: 1000, fallback: null }],
      ['weeklyLimit', { min: 1, max: 5000, fallback: null }],
      ['maxInvitees', { min: 1, max: 1000 }],
    ];

    for (const [field, options] of boundedNumberFields) {
      if (body[field] !== undefined) {
        const parsed = parseIntegerInRange(body[field], options);
        if (parsed === null && body[field] !== null && options.fallback === undefined) {
          return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
        }
        body[field] = parsed;
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
