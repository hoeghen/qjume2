import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { PAYMENT_SECRETS_IF_ENABLED } from '../lib/secrets.js';
import { providerFromEnv, type PaymentProvider } from './index.js';
import { applyPlanChange } from './applyPlan.js';
import {
  TERMS_VERSION,
  type Plan,
  type Shop,
  type TermsAcceptance,
} from '../../../src/types/index.js';

export interface StartCheckoutRequest {
  shopId: string;
  plan: Plan;
  /** The owner ticked "I accept the terms". Required to subscribe, not to cancel. */
  acceptedTerms?: boolean;
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

  if (plan === 'paid' && input.acceptedTerms !== true) {
    // Checked here, not only by the disabled button: a subscription is a
    // recurring charge, and agreeing to it must not depend on the client.
    throw fail(
      'failed-precondition',
      'terms-not-accepted',
      'Accept the terms before starting a subscription.',
    );
  }

  await requireOwner(firestore, shopId, callerUid);

  if (plan === 'paid') {
    // Recorded before the owner is sent to pay, so every subscription that
    // follows has its acceptance on file — which version, who, and when.
    const acceptance: TermsAcceptance = {
      shopId,
      uid: callerUid,
      termsVersion: TERMS_VERSION,
      acceptedAt: Date.now(),
    };
    await firestore.collection('termsAcceptances').add(acceptance);
  }

  const chosen = provider ?? providerFromEnv();
  const session = await chosen.createCheckout(shopId, plan);
  return { url: session.url };
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

  const chosen = provider ?? providerFromEnv();
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
