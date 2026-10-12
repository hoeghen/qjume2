import type { Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { baseUrl } from '../lib/config.js';
import {
  mobilePayApi,
  mobilePayConfigFromEnv,
  type MobilePayApi,
} from './mobilepayApi.js';
import type {
  CheckoutSession,
  CompletedCheckout,
  PaymentProvider,
} from './provider.js';
import type {
  MobilePayBillingSession,
  MobilePaySubscription,
} from '../../../src/types/index.js';

/** Every MobilePay session id starts with this, which is how one is routed back here. */
export const MOBILEPAY_SESSION_PREFIX = 'mobilepay';
const CHECKOUT_PREFIX = `${MOBILEPAY_SESSION_PREFIX}_`;
const CANCEL_PREFIX = `${MOBILEPAY_SESSION_PREFIX}-cancelled_`;

export const PRODUCT_NAME = 'Qjume abonnement';

/** The monthly price in øre, VAT included: what MobilePay actually charges. */
export function mobilePayPriceOre(env = process.env): number {
  const price = Number(env['MOBILEPAY_PRICE_ORE']);
  if (!Number.isInteger(price) || price <= 0) {
    throw new Error('MOBILEPAY_PRICE_ORE is required for the mobilepay payments provider.');
  }
  return price;
}

export interface MobilePayProviderOptions {
  api?: MobilePayApi;
  /** Pause between status checks while an agreement is still PENDING. */
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Subscriptions through Vipps MobilePay's Recurring API.
 *
 * Starting one is an agreement the owner accepts in the MobilePay app, with
 * the first month taken as its initial charge. Unlike Stripe, MobilePay
 * never charges an agreement on its own: `chargeMobilePaySubscriptions`
 * creates each later month's charge, from `subscriptions/{shopId}`. See
 * CLAUDE.md decision 12.
 */
export function mobilepayProvider(
  env = process.env,
  firestore: Firestore = db,
  options: MobilePayProviderOptions = {},
): PaymentProvider {
  const amount = mobilePayPriceOre(env);
  const api = options.api ?? mobilePayApi(mobilePayConfigFromEnv(env));
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const app = baseUrl(env);

  return {
    name: 'mobilepay',

    async createCheckout(shopId, plan): Promise<CheckoutSession> {
      if (plan === 'free') {
        await stopShopAgreement(firestore, api, shopId);
        // Shaped like the stub's and Stripe's cancellation: a relative link
        // `Billing.tsx` follows straight into `completeCheckout`.
        const sessionId = `${CANCEL_PREFIX}${shopId}`;
        return { url: `/shop/billing/return?session=${sessionId}`, sessionId };
      }

      const sessionRef = firestore.collection('billingSessions').doc();
      const sessionId = `${CHECKOUT_PREFIX}${sessionRef.id}`;
      const agreement = await api.createAgreement({
        amount,
        productName: PRODUCT_NAME,
        initialChargeDescription: `${PRODUCT_NAME}, første måned`,
        merchantRedirectUrl: `${app}/shop/billing?session=${sessionId}`,
        merchantAgreementUrl: `${app}/shop/billing`,
      });

      const session: MobilePayBillingSession = {
        provider: 'mobilepay',
        shopId,
        agreementId: agreement.agreementId,
        createdAt: new Date().toISOString(),
      };
      await firestore.doc(`billingSessions/${sessionId}`).set(session);

      return { url: agreement.vippsConfirmationUrl, sessionId };
    },

    async verifyCheckout(sessionId): Promise<CompletedCheckout | null> {
      if (sessionId.startsWith(CANCEL_PREFIX)) {
        // The agreement was stopped in `createCheckout`, behind the owner
        // check. Nothing is called here: this runs *before*
        // `performCompleteCheckout` checks who is asking, so a side effect
        // here would let anyone stop any shop's agreement by naming it.
        const shopId = sessionId.slice(CANCEL_PREFIX.length);
        return shopId ? { shopId, plan: 'free' } : null;
      }
      if (!sessionId.startsWith(CHECKOUT_PREFIX)) return null;

      const snap = await firestore.doc(`billingSessions/${sessionId}`).get();
      const session = snap.data() as MobilePayBillingSession | undefined;
      if (!session) return null;

      // The redirect can beat the agreement's activation by a few seconds,
      // and MobilePay says to poll rather than trust the redirect. The
      // webhook still activates the plan if this gives up first.
      for (let attempt = 0; attempt < 5; attempt++) {
        const { status } = await api.getAgreement(session.agreementId);
        if (status === 'ACTIVE') {
          return {
            shopId: session.shopId,
            plan: 'paid',
            mobilePayAgreementId: session.agreementId,
          };
        }
        if (status !== 'PENDING') return null;
        if (attempt < 4) await sleep(1500);
      }
      return null;
    },
  };
}

export function isMobilePaySession(sessionId: string): boolean {
  return sessionId.startsWith(CHECKOUT_PREFIX) || sessionId.startsWith(CANCEL_PREFIX);
}

/** Stops whatever agreement this shop is being charged on, if any. */
async function stopShopAgreement(
  firestore: Firestore,
  api: MobilePayApi,
  shopId: string,
): Promise<void> {
  const snap = await firestore.doc(`subscriptions/${shopId}`).get();
  const subscription = snap.data() as MobilePaySubscription | undefined;
  if (!subscription) return;
  // Stopping is idempotent at MobilePay, so a stopped one costs one call.
  // A failure is not swallowed, unlike Stripe's: an agreement still active
  // here is one the owner would see in their app and reasonably expect to
  // be charged on, so they should hear it did not stop.
  await api.stopAgreement(subscription.agreementId);
}
