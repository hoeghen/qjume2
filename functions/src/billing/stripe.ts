import Stripe from 'stripe';
import type { Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { baseUrl } from '../lib/config.js';
import type {
  CheckoutSession,
  CompletedCheckout,
  PaymentProvider,
} from './provider.js';
import type { Shop } from '../../../src/types/index.js';

/**
 * Real subscriptions, via Stripe Checkout.
 *
 * Google Pay and Apple Pay need no separate integration: Checkout offers
 * them itself, as ordinary payment-method buttons, to any browser that
 * supports one. Neither is a processor on its own — something has to sit
 * underneath either, and that something is this.
 *
 * `createCheckout`/`verifyCheckout` only really describe *starting* a
 * subscription; "move to free" is a cancellation, not a checkout, so it
 * takes a different path below rather than forcing a browser round trip
 * Stripe has no use for. See CLAUDE.md decision 10.
 */
export function stripeProvider(
  env = process.env,
  firestore: Firestore = db,
): PaymentProvider {
  const secretKey = env['STRIPE_SECRET_KEY'];
  const priceId = env['STRIPE_PRICE_ID'];
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required for the stripe payments provider.');
  }
  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID is required for the stripe payments provider.');
  }

  const stripe = new Stripe(secretKey);
  const app = baseUrl(env);
  // Found or created on first use, then kept for the life of the instance.
  let vatRate: Promise<string> | undefined;

  return {
    name: 'stripe',

    async createCheckout(shopId, plan): Promise<CheckoutSession> {
      if (plan === 'free') return cancelSubscription(firestore, stripe, shopId);

      vatRate ??= danishVatRate(stripe, env['STRIPE_TAX_RATE_ID']);
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        // The price is the subscription before VAT (SUBSCRIPTION_PRICE_DKK);
        // 25 % Danish VAT goes on top, so the invoice shows price, VAT and
        // total separately, as a business customer needs for its books.
        line_items: [{ price: priceId, quantity: 1, tax_rates: [await vatRate] }],
        // Every customer is a business: ask for its name and CVR/VAT number,
        // and its address, so they are on the invoice.
        tax_id_collection: { enabled: true },
        billing_address_collection: 'required',
        // How performCompleteCheckout finds its way back to a shop: Stripe
        // hands this back unchanged on the session it later verifies.
        client_reference_id: shopId,
        success_url: `${app}/shop/billing?session={CHECKOUT_SESSION_ID}`,
        cancel_url: `${app}/shop/billing`,
      });
      if (!session.url) {
        throw new Error('Stripe did not return a checkout URL.');
      }
      return { url: session.url, sessionId: session.id };
    },

    async verifyCheckout(sessionId): Promise<CompletedCheckout | null> {
      if (sessionId.startsWith(CANCEL_PREFIX)) {
        // An immediate cancellation (see cancelSubscription) never round-trips
        // through Stripe's own Checkout, so there is no session to retrieve —
        // by the time this is called, the cancellation already happened.
        const shopId = sessionId.slice(CANCEL_PREFIX.length);
        return shopId ? { shopId, plan: 'free' } : null;
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      });
      if (session.status !== 'complete') return null;

      const shopId = session.client_reference_id;
      if (!shopId) return null;

      const { customer, subscription } = session;
      return {
        shopId,
        plan: 'paid',
        stripeCustomerId: idOf(customer),
        stripeSubscriptionId: idOf(subscription),
      };
    },
  };
}

const CANCEL_PREFIX = 'cancelled_';

/** The slice of the Stripe client `danishVatRate` uses, so it can be tested. */
export interface TaxRateApi {
  taxRates: {
    list(params: { active: boolean; limit: number }): Promise<{ data: Stripe.TaxRate[] }>;
    create(params: Stripe.TaxRateCreateParams): Promise<Stripe.TaxRate>;
  };
}

/**
 * The Stripe tax rate for 25 % Danish VAT added on top of the price.
 *
 * `STRIPE_TAX_RATE_ID` pins one if set. Otherwise an existing active,
 * exclusive 25 % DK rate is reused, and only if there is none is one created
 * — so test and live mode each get theirs on the first checkout, with no
 * step in the Stripe dashboard. Two first checkouts at once may both create
 * one; that leaves a duplicate rate, never a wrong amount.
 */
export async function danishVatRate(stripe: TaxRateApi, pinned?: string): Promise<string> {
  if (pinned) return pinned;
  const { data } = await stripe.taxRates.list({ active: true, limit: 100 });
  const existing = data.find(
    (rate) => rate.percentage === 25 && !rate.inclusive && rate.country === 'DK',
  );
  if (existing) return existing.id;
  const created = await stripe.taxRates.create({
    display_name: 'Moms',
    description: 'Dansk moms 25 %',
    percentage: 25,
    inclusive: false,
    country: 'DK',
    tax_type: 'vat',
  });
  return created.id;
}

/** Stripe returns either an expanded object or a bare id; either way, the id. */
function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

/**
 * Cancels whatever subscription this shop already has, and hands back a
 * session shaped exactly like the stub's and a real Checkout's: a relative
 * `/shop/billing/return?session=...` URL. `Billing.tsx` already knows how to
 * follow that link into `completeCheckout` — a downgrade needed no new code
 * on the client for this reason, only a session id `verifyCheckout` can
 * recognise as its own.
 */
async function cancelSubscription(
  firestore: Firestore,
  stripe: Stripe,
  shopId: string,
): Promise<CheckoutSession> {
  const snap = await firestore.doc(`shops/${shopId}`).get();
  const shop = snap.data() as Shop | undefined;

  if (shop?.stripeSubscriptionId) {
    // Already cancelled, or the id is stale — either way this shop is
    // moving to free regardless, so a failure here does not block that.
    await stripe.subscriptions.cancel(shop.stripeSubscriptionId).catch(() => undefined);
  }

  return {
    url: `/shop/billing/return?session=${CANCEL_PREFIX}${shopId}`,
    sessionId: `${CANCEL_PREFIX}${shopId}`,
  };
}
