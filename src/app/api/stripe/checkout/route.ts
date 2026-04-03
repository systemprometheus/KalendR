import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { organizations, users } from '@/lib/db';
import Stripe from 'stripe';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

const PRICE_MAP: Record<string, { priceId: string; name: string }> = {
  standard: {
    priceId: process.env.STRIPE_STANDARD_PRICE_ID || '',
    name: 'Standard',
  },
  teams: {
    priceId: process.env.STRIPE_TEAMS_PRICE_ID || '',
    name: 'Teams',
  },
};

async function getValidatedPriceId(stripe: Stripe, plan: string) {
  const config = PRICE_MAP[plan];
  const priceId = config?.priceId?.trim();

  if (!priceId) {
    throw new Error(`Billing is not configured for the ${config?.name || plan} plan.`);
  }

  if (!priceId.startsWith('price_')) {
    throw new Error(`Billing configuration for the ${config.name} plan is invalid.`);
  }

  try {
    const price = await stripe.prices.retrieve(priceId);

    if (!price.active) {
      throw new Error('inactive');
    }

    return price.id;
  } catch (error) {
    console.error(`Invalid Stripe price configured for ${plan}:`, error);
    throw new Error(`Billing is temporarily unavailable for the ${config.name} plan.`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const { plan } = await req.json();

    if (!PRICE_MAP[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io';

    const organization = organizations().findById(user.organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const stripe = getStripe();
    const priceId = await getValidatedPriceId(stripe, plan);
    const organizationSeatCount = users().count({ organizationId: organization.id });
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: Math.max(organizationSeatCount, 1),
        },
      ],
      success_url: `${appUrl}/dashboard/billing?success=true&plan=${plan}`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        organizationId: organization.id,
        plan,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          organizationId: organization.id,
          plan,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
