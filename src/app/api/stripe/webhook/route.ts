import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { organizations, users } from '@/lib/db';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  const stripe = getStripe();

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const organizationId = session.metadata?.organizationId;
        const plan = session.metadata?.plan;

        if (plan && (organizationId || userId)) {
          const resolvedOrganizationId = organizationId || users().findById(userId || '')?.organizationId;

          if (resolvedOrganizationId) {
            organizations().update(resolvedOrganizationId, {
              plan,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              planUpdatedAt: new Date().toISOString(),
            });
            console.log(`Organization ${resolvedOrganizationId} upgraded to ${plan} plan`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const organizationId = subscription.metadata?.organizationId;
        const userId = subscription.metadata?.userId;

        const resolvedOrganizationId = organizationId || users().findById(userId || '')?.organizationId;
        if (resolvedOrganizationId) {
          const status = subscription.status;
          organizations().update(resolvedOrganizationId, {
            subscriptionStatus: status,
          });
          console.log(`Organization ${resolvedOrganizationId} subscription status: ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const organizationId = subscription.metadata?.organizationId;
        const userId = subscription.metadata?.userId;

        const resolvedOrganizationId = organizationId || users().findById(userId || '')?.organizationId;
        if (resolvedOrganizationId) {
          organizations().update(resolvedOrganizationId, {
            plan: 'free',
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
            planSeats: 1,
          });
          console.log(`Organization ${resolvedOrganizationId} subscription canceled, reverted to free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          const matchedOrganizations = organizations().findMany({ where: { stripeSubscriptionId: subscriptionId } });
          if (matchedOrganizations.length > 0) {
            organizations().update(matchedOrganizations[0].id, {
              subscriptionStatus: 'past_due',
            });
            console.log(`Organization ${matchedOrganizations[0].id} payment failed, marked past_due`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
