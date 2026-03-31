import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { availabilitySchedules, availabilityRules, availabilityOverrides } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const schedule = availabilitySchedules().findById(id);
    if (!schedule || schedule.userId !== user.id) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const rules = availabilityRules().findMany({ where: { scheduleId: id } })
      .sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek);
    const overrides = availabilityOverrides().findMany({ where: { scheduleId: id } });

    return NextResponse.json({ schedule: { ...schedule, rules, overrides } });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const schedule = availabilitySchedules().findById(id);
    if (!schedule || schedule.userId !== user.id) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, timezone, isDefault, rules, overrides } = body;

    // Update schedule
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (timezone !== undefined) updates.timezone = timezone;

    if (isDefault) {
      // Unset other defaults
      availabilitySchedules().updateMany({ userId: user.id }, { isDefault: false });
      updates.isDefault = true;
    }

    availabilitySchedules().update(id, updates);

    // Update rules if provided
    if (rules && Array.isArray(rules)) {
      availabilityRules().deleteMany({ scheduleId: id });
      for (const rule of rules) {
        availabilityRules().create({
          scheduleId: id,
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
          isEnabled: rule.isEnabled ?? true,
        });
      }
    }

    // Update overrides if provided
    if (overrides && Array.isArray(overrides)) {
      availabilityOverrides().deleteMany({ scheduleId: id });
      for (const override of overrides) {
        availabilityOverrides().create({
          scheduleId: id,
          date: override.date,
          startTime: override.startTime || null,
          endTime: override.endTime || null,
          isUnavailable: override.isUnavailable ?? false,
        });
      }
    }

    const updatedSchedule = availabilitySchedules().findById(id);
    const updatedRules = availabilityRules().findMany({ where: { scheduleId: id } });
    const updatedOverrides = availabilityOverrides().findMany({ where: { scheduleId: id } });

    return NextResponse.json({
      schedule: { ...updatedSchedule, rules: updatedRules, overrides: updatedOverrides },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const schedule = availabilitySchedules().findById(id);
    if (!schedule || schedule.userId !== user.id) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (schedule.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default schedule' }, { status: 400 });
    }

    availabilityRules().deleteMany({ scheduleId: id });
    availabilityOverrides().deleteMany({ scheduleId: id });
    availabilitySchedules().delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
