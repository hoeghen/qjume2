import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { requirePlatformAdmin, type AdminCaller } from '../lib/auth.js';
import { logAdminAction } from './auditLog.js';
import { applyShopDelete, type DeleteShopRequest } from '../shop/deleteShop.js';

export type { DeleteShopRequest };

/**
 * Delete any shop, bypassing the owner check.
 *
 * Shares its validation and deletion with the owner's own `deleteShop`
 * (`applyShopDelete`) — the only difference is who is allowed to call it,
 * which `requirePlatformAdmin` alone decides. `recursiveDelete` is not a
 * transaction (Firestore has no such thing across an unbounded subtree), so
 * the audit entry is written after it resolves rather than inside it. It is
 * written even so, in a top-level collection a shop's own deletion cannot
 * touch — the one action here where "the write and its log could disagree"
 * is a real, if small, gap, not just a rule out of an abundance of caution.
 */
export async function performAdminDeleteShop(
  firestore: Firestore,
  admin: AdminCaller,
  input: DeleteShopRequest,
): Promise<void> {
  const { before } = await applyShopDelete(firestore, input, () => {
    // Already authorized by requirePlatformAdmin.
  });

  await logAdminAction(firestore, null, {
    action: 'shop.delete',
    adminUid: admin.uid,
    adminEmail: admin.email,
    shopId: input.shopId,
    summary: `Deleted ${before.name}`,
  });
}

export const adminDeleteShop = onCall<DeleteShopRequest, Promise<void>>(
  (request: CallableRequest<DeleteShopRequest>) =>
    performAdminDeleteShop(db, requirePlatformAdmin(request), request.data),
);
