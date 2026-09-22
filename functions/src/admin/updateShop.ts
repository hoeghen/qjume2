import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requirePlatformAdmin, type AdminCaller } from '../lib/auth.js';
import { diffFields, logAdminAction } from './auditLog.js';
import type { Shop, ShopProfile } from '../../../src/types/index.js';

export interface AdminUpdateShopRequest {
  shopId: string;
  name: string;
  exclusiveQueues: boolean;
  profile?: ShopProfile | null;
}

/**
 * Edit a shop's own settings, bypassing the owner check entirely.
 *
 * Deliberately narrower than "every field": `plan` and `ownerUid` are not
 * here, and never will be reachable through this function. `plan` changes
 * only through a verified payment (`completeCheckout`) — an admin console
 * that could shortcut it would make the boundary decorative. Reassigning
 * `ownerUid` is a bigger, riskier operation (it hands someone else's account
 * a business) that nobody has asked this console to do; it stays out until
 * they do. `suspended` has its own function, so it survives being reinstated
 * without an unrelated edit accidentally clearing it.
 */
export async function performAdminUpdateShop(
  firestore: Firestore,
  admin: AdminCaller,
  input: AdminUpdateShopRequest,
): Promise<void> {
  const shopId = input.shopId?.trim();
  const name = input.name?.trim();
  if (!shopId || !name) {
    throw fail('invalid-argument', 'shop-not-found', 'shopId and name are required.');
  }

  const shopRef = firestore.doc(`shops/${shopId}`);

  await firestore.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(shopRef);
    const shop = snap.data() as Shop | undefined;
    if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');

    const before: Record<string, unknown> = {
      name: shop.name,
      exclusiveQueues: shop.exclusiveQueues,
      profile: shop.profile ?? null,
    };
    const after: Record<string, unknown> = {
      name,
      exclusiveQueues: input.exclusiveQueues === true,
      profile: input.profile ?? null,
    };

    tx.update(shopRef, after);

    const changes = diffFields(before, after);
    if (Object.keys(changes).length === 0) return;

    await logAdminAction(firestore, tx, {
      action: 'shop.update',
      adminUid: admin.uid,
      adminEmail: admin.email,
      shopId,
      summary: `Edited ${shop.name}`,
      changes,
    });
  });
}

export const adminUpdateShop = onCall<AdminUpdateShopRequest, Promise<void>>(
  (request: CallableRequest<AdminUpdateShopRequest>) =>
    performAdminUpdateShop(db, requirePlatformAdmin(request), request.data),
);
