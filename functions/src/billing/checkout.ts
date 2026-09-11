import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { providerFromEnv, type PaymentProvider } from './index.js';
import {
  FREE_TIER_LIMITS,
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
  provider: PaymentProvider = providerFromEnv(),
): Promise<{ url: string }> {
  const { shopId, plan } = input;
  if (!shopId || (plan !== 'free' && plan !== 'paid')) {
    throw fail('invalid-argument', 'shop-not-found', 'shopId and a plan are required.');
  }

  await requireOwner(firestore, shopId, callerUid);
  const session = await provider.createCheckout(shopId, plan);
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
  provider: PaymentProvider = providerFromEnv(),
): Promise<{ plan: Plan }> {
  const sessionId = input.sessionId?.trim();
  if (!sessionId) {
    throw fail('invalid-argument', 'shop-not-found', 'A sessionId is required.');
  }

  const completed = await provider.verifyCheckout(sessionId);
  if (!completed) {
    throw fail(
      'permission-denied',
      'payment-unverified',
      'That payment could not be verified.',
    );
  }

  await requireOwner(firestore, completed.shopId, callerUid);

  const shopRef = firestore.doc(`shops/${completed.shopId}`);

  await firestore.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(shopRef);
    const shop = snap.data() as Shop | undefined;
    if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');

    if (completed.plan === 'free' && shop.plan === 'paid') {
      // Downgrading below what the shop is already using would leave it in a
      // state the free tier forbids and no code path can produce. Refuse
      // rather than silently deleting queues somebody is standing in.
      const queues = await tx.get(
        shopRef.collection('queues').limit(FREE_TIER_LIMITS.maxQueues + 1),
      );
      if (queues.size > FREE_TIER_LIMITS.maxQueues) {
        throw fail(
          'failed-precondition',
          'downgrade-blocked',
          `Delete all but ${FREE_TIER_LIMITS.maxQueues} queue before moving to the free plan.`,
        );
      }
    }

    tx.update(shopRef, { plan: completed.plan });
  });

  logger.info('Plan changed', {
    shopId: completed.shopId,
    plan: completed.plan,
    provider: provider.name,
  });

  return { plan: completed.plan };
}

export const startCheckout = onCall<StartCheckoutRequest, Promise<{ url: string }>>(
  (request: CallableRequest<StartCheckoutRequest>) =>
    performStartCheckout(db, requireCaller(request).uid, request.data),
);

export const completeCheckout = onCall<
  CompleteCheckoutRequest,
  Promise<{ plan: Plan }>
>((request: CallableRequest<CompleteCheckoutRequest>) =>
  performCompleteCheckout(db, requireCaller(request).uid, request.data),
);
