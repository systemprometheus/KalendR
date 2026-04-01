'use client';
import { useState, useEffect } from 'react';
import { CreditCard, Check, Zap, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSearchParams } from 'next/navigation';

const PLANS = [
  {
    name: 'Free',
    key: 'free',
    price: 0,
    features: ['Unlimited event types', 'Unlimited bookings', 'Calendar integrations', 'Google Meet & Zoom', 'Email notifications', 'Website embeds'],
    cta: 'Current Plan',
    current: true,
  },
  {
    name: 'Standard',
    key: 'standard',
    price: 9,
    features: ['Unlimited event types', '6 connected calendars', 'Custom branding', 'Routing forms', 'Reminders & follow-ups', 'Remove branding'],
    cta: 'Upgrade',
    popular: true,
  },
  {
    name: 'Teams',
    key: 'teams',
    price: 15,
    features: ['Everything in Standard', 'Round-robin scheduling', 'Collective events', 'Team management', 'Admin controls', 'Salesforce integration'],
    cta: 'Upgrade',
  },
  {
    name: 'Enterprise',
    key: 'enterprise',
    price: null,
    features: ['Everything in Teams', 'SSO/SAML', 'Advanced routing', 'Dedicated support', 'Custom SLA', 'API access'],
    cta: 'Contact Sales',
  },
];

export default function BillingPage() {
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      setOrg(data.organization);
      setLoading(false);
    });

    if (searchParams.get('success') === 'true') {
      const plan = searchParams.get('plan');
      setSuccessMessage(`Successfully upgraded to ${plan || 'paid'} plan! Your subscription is now active.`);
      // Refresh user data
      setTimeout(() => {
        fetch('/api/auth/me').then(r => r.json()).then(data => {
          setOrg(data.organization);
        });
      }, 2000);
    }
  }, [searchParams]);

  const handleUpgrade = async (planKey: string) => {
    if (planKey === 'enterprise') {
      window.location.href = 'mailto:sales@kalendr.io?subject=Enterprise%20Plan%20Inquiry';
      return;
    }

    setUpgrading(planKey);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      alert('Failed to start checkout. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      alert('Failed to open billing portal.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin-slow w-8 h-8 border-2 border-[#03b2d1] border-t-transparent rounded-full" /></div>;
  }

  const currentPlan = org?.plan || 'free';

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 mt-1">Manage your subscription and billing</p>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          <Check className="w-4 h-4 inline mr-2" />
          {successMessage}
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Current Plan</h2>
            <p className="text-sm text-gray-500 mt-1">
              You&apos;re on the <span className="font-medium capitalize">{currentPlan}</span> plan
              {org?.planSeats ? ` with ${org.planSeats} seat(s)` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="info" className="text-sm px-3 py-1 capitalize">{currentPlan}</Badge>
            {currentPlan !== 'free' && org?.stripeCustomerId && (
              <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                <ExternalLink className="w-3 h-3 mr-1" />
                Manage Subscription
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.key;
          return (
            <Card key={plan.name} className={`relative ${plan.popular ? 'border-[#03b2d1] border-2' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="info"><Zap className="w-3 h-3 mr-1" /> Most Popular</Badge>
                </div>
              )}
              <div className="pt-2">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  {plan.price !== null ? (
                    <span className="text-3xl font-bold text-gray-900">${plan.price}<span className="text-sm font-normal text-gray-500">/mo per seat</span></span>
                  ) : (
                    <span className="text-xl font-semibold text-gray-900">Custom</span>
                  )}
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isCurrent ? 'outline' : plan.popular ? 'primary' : 'secondary'}
                  className="w-full"
                  disabled={isCurrent || upgrading === plan.key}
                  onClick={() => handleUpgrade(plan.key)}
                >
                  {upgrading === plan.key ? 'Redirecting...' : isCurrent ? 'Current Plan' : plan.cta}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
