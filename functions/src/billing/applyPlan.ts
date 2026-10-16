import { logger } from 'firebase-functions';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { fail } from '../lib/errors.js';
import { syncFreeServicesFlag } from '../lib/freeServices.js';
import type { CompletedCheckout } from './provider.js';
import type { Shop } from '../../../src/types/index.js';

/**
 * Apply a plan change the provider has already vouched for, then bring the
 * queues' discovery copy of the free-services state in step with it.
 */
export async function applyPlanChange(
  firestore: Firestore,
  completed: CompletedCheckout,
  providerName: string,
): Promise<void> {
  const shopRef = firestore.doc(`shops/${completed.shopId}`);

  await firestore.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(shopRef);
    const shop = snap.data() as Shop | undefined;
    if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');

    const update: Partial<Shop> = { plan: completed.plan };
    // Only Stripe hands these back, and only on an upgrade — a downgrade's
    // completed checkout has nothing new to record. Leaving them out of the
    // update rather than writing `undefined` keeps whatever a previous
    // upgrade already stored.
    if (completed.stripeCustomerId !== undefined) {
      update.stripeCustomerId = completed.stripeCustomerId;
    }
    if (completed.stripeSubscriptionId !== undefined) {
      update.stripeSubscriptionId = completed.stripeSubscriptionId;
    }
    tx.update(shopRef, update);
  });

  // A subscription lifts the free-services count, and losing one brings it
  // back: either way the queues' discovery copy may need to change.
  await syncFreeServicesFlag(firestore, completed.shopId);

  logger.info('Plan changed', {
    shopId: completed.shopId,
    plan: completed.plan,
    provider: providerName,
  });
}
