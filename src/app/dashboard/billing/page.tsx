'use client';
import { useState, useEffect } from 'react';
import { CreditCard, Check, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PLANS = [
  {
    name: 'Free',
    price: 0,
    features: ['1 event type', '1 connected calendar', 'Basic scheduling', 'Email notifications'],
    cta: 'Current Plan',
    current: true,
  },
  {
    name: 'Standard',
    price: 12,
    features: ['Unlimited event types', '6 connected calendars', 'Custom branding', 'Routing forms', 'Reminders & follow-ups', 'Remove branding'],
    cta: 'Upgrade',
    popular: true,
  },
  {
    name: 'Teams',
    price: 20,
    features: ['Everything in Standard', 'Round-robin scheduling', 'Collective events', 'Team management', 'Admin controls', 'Salesforce integration'],
    cta: 'Upgrade',
  },
  {
    name: 'Enterprise',
    price: null,
    features: ['Everything in Teams', 'SSO/SAML', 'Advanced routing', 'Dedicated support', 'Custom SLA', 'API access'],
    cta: 'Contact Sales',
  },
];

export default function BillingPage() {
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      setOrg(data.organization);
      setLoading(false);
    });
  }, []);

  const handleUpgrade = (plan: string) => {
    alert(`Stripe checkout would open for the ${plan} plan. Set STRIPE_SECRET_KEY to enable billing.`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin-slow w-8 h-8 border-2 border-[#0069ff] border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 mt-1">Manage your subscription and billing</p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Current Plan</h2>
            <p className="text-sm text-gray-500 mt-1">
              You're on the <span className="font-medium capitalize">{org?.plan || 'Free'}</span> plan
              {org?.planSeats ? ` with ${org.planSeats} seat(s)` : ''}
            </p>
          </div>
          <Badge variant="info" className="text-sm px-3 py-1 capitalize">{org?.plan || 'Free'}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map(plan => {
          const isCurrent = (org?.plan || 'free') === plan.name.toLowerCase();
          return (
            <Card key={plan.name} className={`relative ${plan.popular ? 'border-[#0069ff] border-2' : ''}`}>
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
                  disabled={isCurrent}
                  onClick={() => handleUpgrade(plan.name)}
                >
                  {isCurrent ? 'Current Plan' : plan.cta}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
