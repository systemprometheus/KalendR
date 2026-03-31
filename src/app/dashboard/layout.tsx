import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.onboardingComplete) redirect('/onboarding');
  return <AppShell user={user}>{children}</AppShell>;
}
