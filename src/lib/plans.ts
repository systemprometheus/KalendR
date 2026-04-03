export type PlanKey = 'free' | 'standard' | 'teams_free' | 'teams' | 'enterprise';

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  shortName?: string;
  monthlyPrice: number | null;
  periodLabel: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  popular?: boolean;
  includedSeats?: number;
  billingEnabled?: boolean;
};

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    key: 'free',
    name: 'Free',
    monthlyPrice: 0,
    periodLabel: 'forever',
    description: 'For individuals getting started',
    features: [
      '1 event type',
      'Unlimited bookings',
      'Email notifications',
      'Basic scheduling page',
    ],
    cta: 'Get Started',
  },
  {
    key: 'standard',
    name: 'Standard',
    monthlyPrice: 9,
    periodLabel: '/seat/month',
    description: 'For power users and solo operators',
    features: [
      'Unlimited event types',
      'Custom branding',
      'Routing forms',
      'Reminders & follow-ups',
      'Remove branding',
      '6 connected calendars',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
    popular: true,
    billingEnabled: true,
  },
  {
    key: 'teams_free',
    name: 'Teams Free',
    shortName: 'Team Free',
    monthlyPrice: 0,
    periodLabel: 'up to 5 seats',
    description: 'For small teams switching off Calendly',
    features: [
      'Up to 5 seats included',
      'Round-robin scheduling',
      'Collective events',
      'Team management',
      'Admin controls',
      'Shared booking links',
    ],
    cta: 'Start Free Team',
    includedSeats: 5,
  },
  {
    key: 'teams',
    name: 'Teams',
    monthlyPrice: 15,
    periodLabel: '/seat/month',
    description: 'For growing sales teams that need more than 5 seats',
    features: [
      'Everything in Teams Free',
      'Unlimited seats',
      'Workflow automation',
      'Calendar integrations',
      'Salesforce integration',
      'Priority support',
    ],
    cta: 'Upgrade',
    billingEnabled: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    periodLabel: '',
    description: 'For large organizations',
    features: [
      'Everything in Teams',
      'SSO/SAML',
      'Advanced routing',
      'Dedicated support',
      'Custom SLA',
      'API access',
    ],
    cta: 'Contact Sales',
  },
];

export const PLAN_BY_KEY = Object.fromEntries(
  PLAN_DEFINITIONS.map((plan) => [plan.key, plan]),
) as Record<PlanKey, PlanDefinition>;

export function getPlanLabel(planKey?: string | null) {
  if (!planKey) return 'Free';
  return PLAN_BY_KEY[planKey as PlanKey]?.shortName || PLAN_BY_KEY[planKey as PlanKey]?.name || planKey;
}

export function getDefaultSeatsForPlan(planKey: PlanKey) {
  if (planKey === 'teams_free') return 5;
  return 1;
}
