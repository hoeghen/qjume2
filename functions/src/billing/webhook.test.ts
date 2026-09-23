import { beforeEach, describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { performStripeWebhookEvent } from './webhook.js';
import { clearFirestore, seedQueue, testDb } from '../test/harness.js';

beforeEach(clearFirestore);

/** A fake event shaped enough for `performStripeWebhookEvent` to act on. */
function fakeEvent(
  type: 'customer.subscription.deleted' | 'invoice.payment_failed',
  customer: string,
): Stripe.Event {
  return {
    type,
    data: { object: { customer } },
  } as unknown as Stripe.Event;
}

async function planOf(shopId: string): Promise<string> {
  const snap = await testDb.doc(`shops/${shopId}`).get();
  return (snap.data() as { plan: string }).plan;
}

describe('the Stripe webhook', () => {
  it('downgrades a shop when its subscription is cancelled', async () => {
    const fx = await seedQueue({
      plan: 'paid',
      stripeCustomerId: 'cus_123',
    });

    await performStripeWebhookEvent(
      testDb,
      fakeEvent('customer.subscription.deleted', 'cus_123'),
    );

    expect(await planOf(fx.shopId)).toBe('free');
  });

  it('downgrades a shop whose renewal payment failed', async () => {
    const fx = await seedQueue({
      plan: 'paid',
      stripeCustomerId: 'cus_456',
    });

    await performStripeWebhookEvent(
      testDb,
      fakeEvent('invoice.payment_failed', 'cus_456'),
    );

    expect(await planOf(fx.shopId)).toBe('free');
  });

  it('ignores an event for a customer no shop recognises', async () => {
    const fx = await seedQueue({ plan: 'paid', stripeCustomerId: 'cus_123' });

    await performStripeWebhookEvent(
      testDb,
      fakeEvent('customer.subscription.deleted', 'cus_unknown'),
    );

    // The one shop that does exist is untouched — only its own customer id
    // should ever move it.
    expect(await planOf(fx.shopId)).toBe('paid');
  });

  it('leaves an already-free shop alone', async () => {
    const fx = await seedQueue({ plan: 'free', stripeCustomerId: 'cus_789' });

    await performStripeWebhookEvent(
      testDb,
      fakeEvent('invoice.payment_failed', 'cus_789'),
    );

    expect(await planOf(fx.shopId)).toBe('free');
  });

  it('ignores event types it has nothing to do with', async () => {
    const fx = await seedQueue({ plan: 'paid', stripeCustomerId: 'cus_123' });

    await performStripeWebhookEvent(
      testDb,
      { type: 'checkout.session.completed', data: { object: {} } } as unknown as Stripe.Event,
    );

    expect(await planOf(fx.shopId)).toBe('paid');
  });
});
