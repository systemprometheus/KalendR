import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireAuthWithScopes } from '@/lib/auth';
import { eventTypes, eventTypeHosts, users } from '@/lib/db';
import { ensureDefaultAvailabilitySchedule } from '@/lib/default-availability';
import {
  parseIntegerInRange,
  sanitizeOptionalHttpUrl,
  sanitizeSlug,
  sanitizeText,
} from '@/lib/validation';

export async function GET(_req: Request) {
  try {
    const { user } = await requireAuthWithScopes(['event-types:read']);

    const items = eventTypes().findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ eventTypes: items });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await requireAuthWithScopes(['event-types:write']);

    const body = await req.json();
    const { title, slug, description, duration, locationType, locationValue, color, eventTypeKind,
            minNotice, maxFutureDays, slotInterval, bufferBefore, bufferAfter, dailyLimit, weeklyLimit,
            customQuestions, confirmationMessage, redirectUrl, requiresConfirmation, maxInvitees,
            roundRobinMode, availabilityScheduleId, durationOptions, brandingColor, hideBranding,
            teamId, hosts } = body;
    const normalizedTitle = sanitizeText(title, 120);

    if (!normalizedTitle) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    // Generate unique slug
    let finalSlug = sanitizeSlug(slug) || sanitizeSlug(normalizedTitle) || 'event';
    const existing = eventTypes().findFirst({ where: { userId: user.id, slug: finalSlug } });
    if (existing) {
      finalSlug = `${finalSlug}-${randomBytes(3).toString('hex')}`;
    }

    const schedule = availabilityScheduleId
      ? null
      : ensureDefaultAvailabilitySchedule(user.id, user.timezone || 'America/New_York');

    const et = eventTypes().create({
      title: normalizedTitle,
      slug: finalSlug,
      description: sanitizeText(description, 2000) || '',
      duration: parseIntegerInRange(duration, { min: 5, max: 720, fallback: 30 }) ?? 30,
      color: color || '#03b2d1',
      isActive: true,
      isArchived: false,
      userId: user.id,
      organizationId: user.organizationId,
      teamId: teamId || null,
      eventTypeKind: eventTypeKind || 'one_on_one',
      locationType: locationType || 'google_meet',
      locationValue: sanitizeText(locationValue, 500),
      minNotice: parseIntegerInRange(minNotice, { min: 0, max: 60 * 24 * 30, fallback: 240 }) ?? 240,
      maxFutureDays: parseIntegerInRange(maxFutureDays, { min: 1, max: 365, fallback: 60 }) ?? 60,
      slotInterval: parseIntegerInRange(slotInterval, { min: 5, max: 720, fallback: null }),
      bufferBefore: parseIntegerInRange(bufferBefore, { min: 0, max: 1440, fallback: 0 }) ?? 0,
      bufferAfter: parseIntegerInRange(bufferAfter, { min: 0, max: 1440, fallback: 0 }) ?? 0,
      dailyLimit: parseIntegerInRange(dailyLimit, { min: 1, max: 1000, fallback: null }),
      weeklyLimit: parseIntegerInRange(weeklyLimit, { min: 1, max: 5000, fallback: null }),
      maxInvitees: parseIntegerInRange(maxInvitees, { min: 1, max: 1000, fallback: 1 }) ?? 1,
      roundRobinMode: roundRobinMode || null,
      availabilityScheduleId: availabilityScheduleId || schedule?.id || null,
      customQuestions: customQuestions ? JSON.stringify(customQuestions) : null,
      confirmationMessage: sanitizeText(confirmationMessage, 2000),
      redirectUrl: sanitizeOptionalHttpUrl(redirectUrl),
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Create event type error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
