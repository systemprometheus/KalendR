import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { organizations } from '@/lib/db';
import { PlanKey, getDefaultSeatsForPlan } from '@/lib/plans';

const SELF_SERVE_FREE_PLANS = new Set<PlanKey>(['free', 'teams_free']);

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    if (user.orgRole !== 'owner' && user.orgRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { plan } = await req.json();
    if (!SELF_SERVE_FREE_PLANS.has(plan)) {
      return NextResponse.json({ error: 'Invalid free plan' }, { status: 400 });
    }

    const organization = organizations().findById(user.organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (organization.stripeSubscriptionId) {
      return NextResponse.json({
        error: 'Please use the billing portal to manage an active paid subscription.',
      }, { status: 400 });
    }

    const nextSeats = plan === 'teams_free'
      ? Math.max(organization.planSeats || 1, getDefaultSeatsForPlan('teams_free'))
      : getDefaultSeatsForPlan('free');

    organizations().update(organization.id, {
      plan,
      planSeats: nextSeats,
      stripeSubscriptionId: plan === 'free' ? null : organization.stripeSubscriptionId,
      planUpdatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, plan, planSeats: nextSeats });
  } catch (error) {
    console.error('Billing plan update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
