import Stripe from 'stripe';
import { onRequest, type Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
import { logger } from 'firebase-functions';
import { type Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { STRIPE_WEBHOOK_SECRETS_IF_ENABLED } from '../lib/secrets.js';
import type { Shop } from '../../../src/types/index.js';

/**
 * Keeps `shop.plan` honest between checkouts.
 *
 * `verifyCheckout` only ever runs when the owner is back in the app after
 * paying — right for starting a subscription, useless for noticing a card
 * that later fails or a cancellation made from Stripe's own portal. Only
 * Stripe knows when either happens, which is what a webhook is for. See
 * CLAUDE.md decision 10.
 */
export async function performStripeWebhookEvent(
  firestore: Firestore,
  event: Stripe.Event,
): Promise<void> {
  if (event.type !== 'customer.subscription.deleted' && event.type !== 'invoice.payment_failed') {
    return;
  }

  const customerId =
    event.type === 'customer.subscription.deleted'
      ? event.data.object.customer
      : event.data.object.customer;
  const stripeCustomerId =
    typeof customerId === 'string' ? customerId : customerId?.id;
  if (!stripeCustomerId) return;

  const matches = await firestore
    .collection('shops')
    .where('stripeCustomerId', '==', stripeCustomerId)
    .limit(1)
    .get();
  const shopDoc = matches.docs[0];
  if (!shopDoc) {
    // Nothing to downgrade — most likely a customer this app never
    // completed a checkout for (a test event, an abandoned session).
    logger.warn('Stripe webhook: no shop for customer', { stripeCustomerId, type: event.type });
    return;
  }

  const shop = shopDoc.data() as Shop;
  if (shop.plan !== 'paid') return;

  await shopDoc.ref.update({ plan: 'free' });
  logger.info('Plan changed', {
    shopId: shopDoc.id,
    plan: 'free',
    provider: 'stripe',
    reason: event.type,
  });
}

/**
 * The raw HTTP endpoint Stripe posts to.
 *
 * `onRequest`, not `onCall`: Stripe is not a signed-in Firebase user, and
 * its own signature (`Stripe-Signature`, checked against
 * `STRIPE_WEBHOOK_SECRET`) is what proves a request actually came from
 * Stripe — the only authentication this endpoint has or needs.
 */
export const stripeWebhook = onRequest(
  { secrets: STRIPE_WEBHOOK_SECRETS_IF_ENABLED },
  async (request: Request, response: Response) => {
    const secretKey = process.env['STRIPE_SECRET_KEY'];
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
    const signature = request.headers['stripe-signature'];

    if (!secretKey || !webhookSecret || typeof signature !== 'string') {
      response.status(500).send('Webhook not configured.');
      return;
    }

    const stripe = new Stripe(secretKey);
    let event: Stripe.Event;
    try {
      // `request.rawBody` (raw, unparsed bytes) is what the signature was
      // computed over; the JSON Express would otherwise hand this function
      // has already been re-serialised and would not match.
      event = stripe.webhooks.constructEvent(request.rawBody, signature, webhookSecret);
    } catch (e) {
      logger.warn('Stripe webhook: bad signature', { error: (e as Error).message });
      response.status(400).send('Invalid signature.');
      return;
    }

    await performStripeWebhookEvent(db, event);
    response.status(200).send('ok');
  },
);
