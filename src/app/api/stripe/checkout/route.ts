import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
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

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await req.json();

    if (!PRICE_MAP[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kalendr.io';

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_MAP[plan].priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/billing?success=true&plan=${plan}`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
      customer_email: session.email,
      metadata: {
        userId: session.userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId: session.userId,
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
