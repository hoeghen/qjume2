import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import type { Shop } from '../../../src/types/index.js';

export interface DeleteShopRequest {
  shopId: string;
}

/**
 * Permanently remove a shop: its queues, their tickets and stations, and its
 * staff — everything under `shops/{shopId}`.
 *
 * `recursiveDelete` is not a transaction (Firestore has no such thing across
 * an unbounded subtree), so the existence check reads the shop just before
 * deleting it rather than inside a transaction with it.
 *
 * Shared by the owner's own `deleteShop` and the platform admin's
 * `adminDeleteShop`, the same split as `applyQueueDelete` — `authorize` is
 * the only difference.
 */
export async function applyShopDelete(
  firestore: Firestore,
  input: DeleteShopRequest,
  authorize: (shop: Shop) => void,
): Promise<{ before: Shop }> {
  const shopId = input.shopId?.trim();
  if (!shopId) {
    throw fail('invalid-argument', 'shop-not-found', 'shopId is required.');
  }

  const shopRef = firestore.doc(`shops/${shopId}`);
  const snap = await shopRef.get();
  const shop = snap.data() as Shop | undefined;
  if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');
  authorize(shop);

  await firestore.recursiveDelete(shopRef);
  // Top-level, so the recursive delete does not reach it; an owner's email
  // must not outlive their shop.
  await firestore.doc(`shopOwners/${shopId}`).delete();

  return { before: shop };
}

export async function performDeleteShop(
  firestore: Firestore,
  callerUid: string,
  input: DeleteShopRequest,
): Promise<void> {
  await applyShopDelete(firestore, input, (shop) => {
    if (shop.ownerUid !== callerUid) {
      throw fail(
        'permission-denied',
        'not-shop-owner',
        'Only the shop owner can delete this shop.',
      );
    }
  });
}

export const deleteShop = onCall<DeleteShopRequest, Promise<void>>(
  (request: CallableRequest<DeleteShopRequest>) =>
    performDeleteShop(db, requireCaller(request).uid, request.data),
);
