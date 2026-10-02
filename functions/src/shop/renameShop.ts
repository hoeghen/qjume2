import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import {
  type DocumentReference,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import type { Shop } from '../../../src/types/index.js';

export interface RenameShopRequest {
  shopId: string;
  name: string;
}

/** Long enough for any real shop name, short enough to fit a discovery row. */
export const MAX_SHOP_NAME_LENGTH = 80;

export function cleanShopName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (!name || name.length > MAX_SHOP_NAME_LENGTH) {
    throw fail(
      'invalid-argument',
      'shop-not-found',
      `A shop name must be 1 to ${MAX_SHOP_NAME_LENGTH} characters.`,
    );
  }
  return name;
}

/**
 * Write a new shop name everywhere it lives, inside the caller's transaction.
 *
 * The name is denormalised onto every queue as `shopName`, because discovery
 * is one collection-group query over queues and cannot afford a read per
 * shop. A rename that changed only the shop doc would leave every listing
 * showing the old name — so the shop and all its queues change together, or
 * not at all. Reads the queues itself, so call it before any write.
 */
export async function renameShopInTransaction(
  tx: Transaction,
  shopRef: DocumentReference,
  name: string,
): Promise<void> {
  const queues = await tx.get(shopRef.collection('queues'));
  tx.update(shopRef, { name });
  for (const queue of queues.docs) tx.update(queue.ref, { shopName: name });
}

/** The owner renaming their own shop. */
export async function performRenameShop(
  firestore: Firestore,
  callerUid: string,
  input: RenameShopRequest,
): Promise<{ name: string }> {
  const shopId = input.shopId?.trim();
  if (!shopId) throw fail('invalid-argument', 'shop-not-found', 'shopId is required.');
  const name = cleanShopName(input.name);

  const shopRef = firestore.doc(`shops/${shopId}`);
  await firestore.runTransaction(async (tx: Transaction) => {
    const shop = (await tx.get(shopRef)).data() as Shop | undefined;
    if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');
    if (shop.ownerUid !== callerUid) {
      throw fail('permission-denied', 'not-shop-owner', 'Only the shop owner can do that.');
    }
    await renameShopInTransaction(tx, shopRef, name);
  });
  return { name };
}

export const renameShop = onCall<RenameShopRequest, Promise<{ name: string }>>(
  (request: CallableRequest<RenameShopRequest>) =>
    performRenameShop(db, requireCaller(request).uid, request.data),
);
