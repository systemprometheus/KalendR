import { organizations, users } from './db';
import { generateSlug } from './auth';
import { ensureDefaultAvailabilitySchedule } from './default-availability';

type ProvisionableUser = {
  id: string;
  name: string;
  timezone?: string | null;
  organizationId?: string | null;
  orgRole?: string | null;
};

export function ensureUserWorkspace<T extends ProvisionableUser>(
  user: T
): T & { organizationId?: string; orgRole?: string } {
  const nextUser = { ...user } as T & { organizationId?: string; orgRole?: string };

  if (!nextUser.organizationId) {
    const org = organizations().create({
      name: `${user.name}'s Organization`,
      slug: generateSlug(`${user.name}-org`),
      plan: 'free',
      planSeats: 1,
    });

    users().update(user.id, {
      organizationId: org.id,
      orgRole: nextUser.orgRole || 'owner',
    });

    nextUser.organizationId = org.id;
    nextUser.orgRole = nextUser.orgRole || 'owner';
  }

  ensureDefaultAvailabilitySchedule(user.id, nextUser.timezone || 'America/New_York');

  return nextUser;
}
