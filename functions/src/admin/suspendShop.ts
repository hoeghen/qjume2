import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requirePlatformAdmin, type AdminCaller } from '../lib/auth.js';
import { logAdminAction } from './auditLog.js';
import type { Shop } from '../../../src/types/index.js';

export interface SuspendShopRequest {
  shopId: string;
}

export interface SuspendShopResult {
  suspended: boolean;
}

/**
 * Suspend or reinstate a shop, platform-wide.
 *
 * Distinct from the shop's own open/closed toggle on purpose: `suspended`
 * lives on the shop, not any one queue, an owner has no client path to it at
 * all (there is no rule granting a write), and only `reinstateShop` can clear
 * it. Every queue underneath gets the same denormalised copy discovery
 * already relies on for `shopName` — one transaction, since a shop's queue
 * count is always small enough for one.
 */
async function setSuspension(
  firestore: Firestore,
  admin: AdminCaller,
  shopId: string,
  suspended: boolean,
): Promise<SuspendShopResult> {
  const trimmedId = shopId?.trim();
  if (!trimmedId) {
    throw fail('invalid-argument', 'shop-not-found', 'shopId is required.');
  }

  const shopRef = firestore.doc(`shops/${trimmedId}`);
  const queuesRef = shopRef.collection('queues');

  await firestore.runTransaction(async (tx: Transaction) => {
    const [shopSnap, queuesSnap] = await Promise.all([
      tx.get(shopRef),
      tx.get(queuesRef),
    ]);
    const shop = shopSnap.data() as Shop | undefined;
    if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');

    tx.update(shopRef, { suspended });
    for (const queueDoc of queuesSnap.docs) {
      tx.update(queueDoc.ref, { shopSuspended: suspended });
    }

    await logAdminAction(firestore, tx, {
      action: suspended ? 'shop.suspend' : 'shop.reinstate',
      adminUid: admin.uid,
      adminEmail: admin.email,
      shopId: trimmedId,
      summary: `${suspended ? 'Suspended' : 'Reinstated'} ${shop.name}`,
    });
  });

  return { suspended };
}

export async function performSuspendShop(
  firestore: Firestore,
  admin: AdminCaller,
  input: SuspendShopRequest,
): Promise<SuspendShopResult> {
  return setSuspension(firestore, admin, input.shopId, true);
}

export async function performReinstateShop(
  firestore: Firestore,
  admin: AdminCaller,
  input: SuspendShopRequest,
): Promise<SuspendShopResult> {
  return setSuspension(firestore, admin, input.shopId, false);
}

export const suspendShop = onCall<SuspendShopRequest, Promise<SuspendShopResult>>(
  (request: CallableRequest<SuspendShopRequest>) =>
    performSuspendShop(db, requirePlatformAdmin(request), request.data),
);

export const reinstateShop = onCall<SuspendShopRequest, Promise<SuspendShopResult>>(
  (request: CallableRequest<SuspendShopRequest>) =>
    performReinstateShop(db, requirePlatformAdmin(request), request.data),
);
