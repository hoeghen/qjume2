import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { PAYMENT_SECRETS_IF_ENABLED } from '../lib/secrets.js';
import {
  mobilepayProvider,
  providerForSession,
  providerFromEnv,
  type PaymentProvider,
} from './index.js';
import { applyPlanChange } from './applyPlan.js';
import {
  type MobilePaySubscription,
  type Plan,
  type Shop,
} from '../../../src/types/index.js';

export interface StartCheckoutRequest {
  shopId: string;
  plan: Plan;
}

export interface CompleteCheckoutRequest {
  sessionId: string;
}

async function requireOwner(
  firestore: Firestore,
  shopId: string,
  callerUid: string,
): Promise<Shop> {
  const snap = await firestore.doc(`shops/${shopId}`).get();
  const shop = snap.data() as Shop | undefined;
  if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');
  if (shop.ownerUid !== callerUid) {
    // Billing is the owner's alone. Staff cannot see it, let alone change it.
    throw fail(
      'permission-denied',
      'not-shop-owner',
      'Only the shop owner can change the plan.',
    );
  }
  return shop;
}

export async function performStartCheckout(
  firestore: Firestore,
  callerUid: string,
  input: StartCheckoutRequest,
  provider?: PaymentProvider,
): Promise<{ url: string }> {
  const { shopId, plan } = input;
  if (!shopId || (plan !== 'free' && plan !== 'paid')) {
    throw fail('invalid-argument', 'shop-not-found', 'shopId and a plan are required.');
  }

  await requireOwner(firestore, shopId, callerUid);
  const chosen =
    provider ??
    (plan === 'free' ? await providerHoldingShop(firestore, shopId) : providerFromEnv());
  const session = await chosen.createCheckout(shopId, plan);
  return { url: session.url };
}

/**
 * Who to cancel with: whoever is actually charging the shop. New checkouts
 * follow `PAYMENTS_PROVIDER`, but a shop that subscribed through MobilePay
 * stays MobilePay's to cancel even after that setting moves on.
 */
async function providerHoldingShop(
  firestore: Firestore,
  shopId: string,
): Promise<PaymentProvider> {
  const snap = await firestore.doc(`subscriptions/${shopId}`).get();
  const subscription = snap.data() as MobilePaySubscription | undefined;
  return subscription?.status === 'active' ? mobilepayProvider() : providerFromEnv();
}

/**
 * Apply a plan change, having asked the provider whether it was really paid.
 *
 * The session id arrives from the browser and is therefore not evidence of
 * anything — it is a lookup key. The provider is the authority, which is why
 * nothing here reads a plan out of the request.
 */
export async function performCompleteCheckout(
  firestore: Firestore,
  callerUid: string,
  input: CompleteCheckoutRequest,
  provider?: PaymentProvider,
): Promise<{ plan: Plan }> {
  const sessionId = input.sessionId?.trim();
  if (!sessionId) {
    throw fail('invalid-argument', 'shop-not-found', 'A sessionId is required.');
  }

  const chosen = provider ?? providerForSession(sessionId);
  const completed = await chosen.verifyCheckout(sessionId);
  if (!completed) {
    throw fail(
      'permission-denied',
      'payment-unverified',
      'That payment could not be verified.',
    );
  }

  await requireOwner(firestore, completed.shopId, callerUid);
  await applyPlanChange(firestore, completed, chosen.name);

  return { plan: completed.plan };
}

export const startCheckout = onCall<StartCheckoutRequest, Promise<{ url: string }>>(
  { secrets: PAYMENT_SECRETS_IF_ENABLED },
  (request: CallableRequest<StartCheckoutRequest>) =>
    performStartCheckout(db, requireCaller(request).uid, request.data),
);

export const completeCheckout = onCall<
  CompleteCheckoutRequest,
  Promise<{ plan: Plan }>
>({ secrets: PAYMENT_SECRETS_IF_ENABLED }, (request: CallableRequest<CompleteCheckoutRequest>) =>
  performCompleteCheckout(db, requireCaller(request).uid, request.data),
);
