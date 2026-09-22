import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requirePlatformAdmin, type AdminCaller } from '../lib/auth.js';
import { logAdminAction } from './auditLog.js';
import type { Shop } from '../../../src/types/index.js';

export interface DeleteShopRequest {
  shopId: string;
}

/**
 * Permanently remove a shop: its queues, their tickets and stations, and its
 * staff — everything under `shops/{shopId}`.
 *
 * `recursiveDelete` is not a transaction (Firestore has no such thing across
 * an unbounded subtree), so the audit entry is written after it resolves
 * rather than inside it. It is written even so, in a top-level collection a
 * shop's own deletion cannot touch — the one action here where "the write and
 * its log could disagree" is a real, if small, gap, not just a rule out of an
 * abundance of caution.
 */
export async function performAdminDeleteShop(
  firestore: Firestore,
  admin: AdminCaller,
  input: DeleteShopRequest,
): Promise<void> {
  const shopId = input.shopId?.trim();
  if (!shopId) {
    throw fail('invalid-argument', 'shop-not-found', 'shopId is required.');
  }

  const shopRef = firestore.doc(`shops/${shopId}`);
  const snap = await shopRef.get();
  const shop = snap.data() as Shop | undefined;
  if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');

  await firestore.recursiveDelete(shopRef);

  await logAdminAction(firestore, null, {
    action: 'shop.delete',
    adminUid: admin.uid,
    adminEmail: admin.email,
    shopId,
    summary: `Deleted ${shop.name}`,
  });
}

export const adminDeleteShop = onCall<DeleteShopRequest, Promise<void>>(
  (request: CallableRequest<DeleteShopRequest>) =>
    performAdminDeleteShop(db, requirePlatformAdmin(request), request.data),
);
