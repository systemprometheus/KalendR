import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { eventTypes, eventTypeHosts, users } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const items = eventTypes().findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ eventTypes: items });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title, slug, description, duration, locationType, locationValue, color, eventTypeKind,
            minNotice, maxFutureDays, slotInterval, bufferBefore, bufferAfter, dailyLimit, weeklyLimit,
            customQuestions, confirmationMessage, redirectUrl, requiresConfirmation, maxInvitees,
            roundRobinMode, availabilityScheduleId, durationOptions, brandingColor, hideBranding,
            teamId, hosts } = body;

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    // Generate unique slug
    let finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existing = eventTypes().findFirst({ where: { userId: user.id, slug: finalSlug } });
    if (existing) {
      finalSlug = `${finalSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const et = eventTypes().create({
      title,
      slug: finalSlug,
      description: description || '',
      duration: duration || 30,
      color: color || '#03b2d1',
      isActive: true,
      isArchived: false,
      userId: user.id,
      organizationId: user.organizationId,
      teamId: teamId || null,
      eventTypeKind: eventTypeKind || 'one_on_one',
      locationType: locationType || 'google_meet',
      locationValue: locationValue || null,
      minNotice: minNotice ?? 240,
      maxFutureDays: maxFutureDays ?? 60,
      slotInterval: slotInterval || null,
      bufferBefore: bufferBefore ?? 0,
      bufferAfter: bufferAfter ?? 0,
      dailyLimit: dailyLimit || null,
      weeklyLimit: weeklyLimit || null,
      maxInvitees: maxInvitees ?? 1,
      roundRobinMode: roundRobinMode || null,
      availabilityScheduleId: availabilityScheduleId || null,
      customQuestions: customQuestions ? JSON.stringify(customQuestions) : null,
      confirmationMessage: confirmationMessage || null,
      redirectUrl: redirectUrl || null,
      requiresConfirmation: requiresConfirmation ?? false,
      durationOptions: durationOptions ? JSON.stringify(durationOptions) : null,
      brandingColor: brandingColor || null,
      hideBranding: hideBranding ?? false,
    });

    // Add hosts for team events
    if (hosts && Array.isArray(hosts)) {
      for (const host of hosts) {
        eventTypeHosts().create({
          eventTypeId: et.id,
          userId: host.userId,
          isRequired: host.isRequired ?? false,
          priority: host.priority ?? 0,
        });
      }
    }

    return NextResponse.json({ eventType: et }, { status: 201 });
  } catch (error) {
    console.error('Create event type error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
