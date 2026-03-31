import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { organizations } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let org = null;
    if (user.organizationId) {
      org = organizations().findById(user.organizationId);
      if (org) {
        const { stripeCustomerId, stripeSubscriptionId, ...safeOrg } = org;
        org = safeOrg;
      }
    }

    return NextResponse.json({ user, organization: org });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
