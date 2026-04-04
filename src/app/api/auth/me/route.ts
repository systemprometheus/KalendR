import { NextResponse } from 'next/server';
import { requireAuthWithScopes } from '@/lib/auth';
import { organizations } from '@/lib/db';

export async function GET() {
  try {
    const { user } = await requireAuthWithScopes(['profile:read']);

    let org = null;
    if (user.organizationId) {
      org = organizations().findById(user.organizationId);
      if (org) {
        const { stripeSubscriptionId, ...restOrg } = org;
        org = {
          ...restOrg,
          hasBillingPortalAccess: Boolean(
            org.stripeCustomerId &&
            org.plan !== 'free' &&
            org.plan !== 'teams_free',
          ),
        };
      }
    }

    return NextResponse.json({ user, organization: org });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
