#!/usr/bin/env node
// Creates or reuses the Stripe products and monthly recurring prices
// required by the KalendR billing flow.

const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const PLANS = [
  {
    key: 'standard',
    productName: 'KalendR Standard',
    description: 'Standard plan for KalendR with unlimited event types and advanced scheduling features.',
    unitAmount: 900,
    envKey: 'STRIPE_STANDARD_PRICE_ID',
  },
  {
    key: 'teams',
    productName: 'KalendR Teams',
    description: 'Teams plan for KalendR with collaborative scheduling, admin controls, and Salesforce integration.',
    unitAmount: 1500,
    envKey: 'STRIPE_TEAMS_PRICE_ID',
  },
];

async function findOrCreateProduct(stripe, plan) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const existing = products.data.find((product) => (
    product.metadata?.app === 'kalendr' &&
    product.metadata?.kalendrPlan === plan.key
  )) || products.data.find((product) => product.name === plan.productName);

  if (existing) return existing;

  return stripe.products.create({
    name: plan.productName,
    description: plan.description,
    metadata: {
      app: 'kalendr',
      kalendrPlan: plan.key,
    },
  });
}

async function findOrCreateMonthlyPrice(stripe, product, plan) {
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });

  const existing = prices.data.find((price) => (
    price.type === 'recurring' &&
    price.currency === 'usd' &&
    price.unit_amount === plan.unitAmount &&
    price.recurring?.interval === 'month'
  ));

  if (existing) return existing;

  return stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: plan.unitAmount,
    recurring: {
      interval: 'month',
    },
    nickname: `${plan.productName} Monthly`,
    metadata: {
      app: 'kalendr',
      kalendrPlan: plan.key,
      billingPeriod: 'monthly',
    },
  });
}

async function findOrCreatePaymentLink(stripe, price, plan) {
  const links = await stripe.paymentLinks.list({ active: true, limit: 100 });
  const existing = links.data.find((link) => (
    link.metadata?.app === 'kalendr' &&
    link.metadata?.kalendrPlan === plan.key &&
    link.metadata?.priceId === price.id
  ));

  if (existing) return existing;

  return stripe.paymentLinks.create({
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    metadata: {
      app: 'kalendr',
      kalendrPlan: plan.key,
      priceId: price.id,
    },
    allow_promotion_codes: true,
  });
}

function getModeFromKey(secretKey) {
  if (secretKey.startsWith('sk_live_')) return 'live';
  if (secretKey.startsWith('sk_test_')) return 'test';
  return 'unknown';
}

async function main() {
  loadEnvFile();

  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    console.error('Missing STRIPE_SECRET_KEY in your environment.');
    console.error('Set it in .env or export it in your shell, then run this script again.');
    process.exit(1);
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
  });

  console.log(`Stripe mode: ${getModeFromKey(secretKey)}`);
  console.log('Setting up KalendR billing products and prices...\n');

  const results = [];

  for (const plan of PLANS) {
    const product = await findOrCreateProduct(stripe, plan);
    const price = await findOrCreateMonthlyPrice(stripe, product, plan);
    const paymentLink = await findOrCreatePaymentLink(stripe, price, plan);

    results.push({
      plan: plan.key,
      envKey: plan.envKey,
      productId: product.id,
      priceId: price.id,
      paymentLinkUrl: paymentLink.url,
    });

    console.log(`${plan.productName}`);
    console.log(`  Product: ${product.id}`);
    console.log(`  Price:   ${price.id}`);
    console.log(`  Link:    ${paymentLink.url}\n`);
  }

  console.log('Paste these into your app environment:\n');
  for (const result of results) {
    console.log(`${result.envKey}="${result.priceId}"`);
  }
}

main().catch((error) => {
  console.error('\nStripe setup failed.');
  console.error(error.message || error);
  process.exit(1);
});
