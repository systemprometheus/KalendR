import { redirect } from 'next/navigation';
import OnboardingClient from './onboarding-client';
import { getCurrentUser } from '@/lib/auth';

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.onboardingComplete) {
    redirect('/dashboard');
  }

  return (
    <OnboardingClient
      initialTimezone={user.timezone || 'America/New_York'}
      initialSlug={user.slug || ''}
      initialWelcomeMessage={user.welcomeMessage || 'Welcome! Please pick a time that works for you.'}
    />
  );
}
