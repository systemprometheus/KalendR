import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { users, eventTypes, availabilitySchedules } from '@/lib/db';
import { ensureDefaultAvailabilitySchedule } from '@/lib/default-availability';
import { ensureUserWorkspace } from '@/lib/default-user-setup';

export async function POST(req: NextRequest) {
  try {
    let user = await getCurrentUser() as any;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    user = ensureUserWorkspace(user);
    const wasOnboardingComplete = Boolean(user.onboardingComplete);

    const body = await req.json();
    const { timezone, slug, welcomeMessage, createDefaultEvents } = body;

    // Update user profile
    const updates: any = { onboardingComplete: true };
    if (timezone) updates.timezone = timezone;
    if (slug) {
      const existingSlug = users().findFirst({ where: { slug } });
      if (existingSlug && existingSlug.id !== user.id) {
        return NextResponse.json({ error: 'This URL is already taken' }, { status: 409 });
      }
      updates.slug = slug;
    }
    if (welcomeMessage !== undefined) updates.welcomeMessage = welcomeMessage;

    users().update(user.id, updates);

    // Ensure every user has a default schedule before we attach event types to it.
    let schedule = ensureDefaultAvailabilitySchedule(user.id, timezone || user.timezone || 'America/New_York');
    if (timezone && schedule) {
      schedule = availabilitySchedules().update(schedule.id, { timezone }) || { ...schedule, timezone };
    }

    // Create default sales-focused event types
    if (!wasOnboardingComplete && createDefaultEvents !== false) {
      const defaults = [
        {
          title: 'Book a Demo',
          slug: 'book-a-demo',
          description: 'Schedule a personalized product demo with our team',
          duration: 30,
          color: '#03b2d1',
          locationType: 'google_meet',
          customQuestions: JSON.stringify([
            { id: 'company', label: 'Company Name', type: 'text', required: true },
            { id: 'role', label: 'Your Role', type: 'text', required: false },
            { id: 'size', label: 'Company Size', type: 'select', required: true, options: ['1-10', '11-50', '51-200', '201-1000', '1000+'] },
          ]),
        },
        {
          title: 'Quick Discovery Call',
          slug: 'discovery-call',
          description: 'A brief call to understand your needs and see if we\'re a fit',
          duration: 15,
          color: '#10b981',
          locationType: 'phone',
        },
        {
          title: 'Enterprise Demo',
          slug: 'enterprise-demo',
          description: 'In-depth walkthrough for enterprise evaluation',
          duration: 60,
          color: '#8b5cf6',
          locationType: 'google_meet',
          customQuestions: JSON.stringify([
            { id: 'company', label: 'Company Name', type: 'text', required: true },
            { id: 'employees', label: 'Number of Employees', type: 'select', required: true, options: ['201-500', '501-1000', '1001-5000', '5000+'] },
            { id: 'use_case', label: 'Primary Use Case', type: 'textarea', required: true, placeholder: 'Tell us about your scheduling needs...' },
          ]),
        },
      ];

      for (const et of defaults) {
        eventTypes().create({
          ...et,
          userId: user.id,
          isActive: true,
          isArchived: false,
          eventTypeKind: 'one_on_one',
          minNotice: 240,
          maxFutureDays: 60,
          bufferBefore: 0,
          bufferAfter: 10,
          maxInvitees: 1,
          requiresConfirmation: false,
          hideBranding: false,
          availabilityScheduleId: schedule?.id,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
