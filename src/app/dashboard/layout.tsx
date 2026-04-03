import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { organizations } from '@/lib/db';
import { AppShell } from '@/components/layout/app-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const currentPlan = user.organizationId
    ? organizations().findById(user.organizationId)?.plan || 'free'
    : 'free';

  return <AppShell user={user} currentPlan={currentPlan}>{children}</AppShell>;
}
