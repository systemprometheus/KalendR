import { NextRequest, NextResponse } from 'next/server';
import { users, organizations, availabilitySchedules, availabilityRules } from '@/lib/db';
import { hashPassword, createSession, generateSlug } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, timezone } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check existing user
    const existing = users().findFirst({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const slug = generateSlug(name);

    // Create organization
    const org = organizations().create({
      name: `${name}'s Organization`,
      slug: generateSlug(name + '-org'),
      plan: 'free',
      planSeats: 1,
    });

    // Create user
    const user = users().create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      slug,
      timezone: timezone || 'America/New_York',
      locale: 'en',
      onboardingComplete: false,
      organizationId: org.id,
      orgRole: 'owner',
    });

    // Create default availability schedule (Mon-Fri 9am-5pm)
    const schedule = availabilitySchedules().create({
      name: 'Working Hours',
      userId: user.id,
      timezone: timezone || 'America/New_York',
      isDefault: true,
    });

    // Add Mon-Fri 9-5 rules
    for (let day = 1; day <= 5; day++) {
      availabilityRules().create({
        scheduleId: schedule.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        isEnabled: true,
      });
    }

    // Create session
    const token = await createSession(user.id);

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, slug: user.slug, timezone: user.timezone, onboardingComplete: false },
    }, { status: 201 });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
