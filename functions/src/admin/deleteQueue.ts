import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { requirePlatformAdmin, type AdminCaller } from '../lib/auth.js';
import { logAdminAction } from './auditLog.js';
import { applyQueueDelete, type DeleteQueueRequest } from '../shop/deleteQueue.js';

/**
 * Delete any queue, bypassing the owner check.
 *
 * Shares its validation and deletion with the owner's own `deleteQueue`
 * (`applyQueueDelete`) — the only difference is who is allowed to call it,
 * which `requirePlatformAdmin` alone decides. `recursiveDelete` is not
 * transactional across an unbounded subtree (see `deleteShop.ts`), so the
 * audit entry is written after it resolves, not inside it.
 */
export async function performAdminDeleteQueue(
  firestore: Firestore,
  admin: AdminCaller,
  input: DeleteQueueRequest,
): Promise<void> {
  const { before } = await applyQueueDelete(firestore, input, () => {
    // Already authorized by requirePlatformAdmin.
  });

  await logAdminAction(firestore, null, {
    action: 'queue.delete',
    adminUid: admin.uid,
    adminEmail: admin.email,
    shopId: input.shopId,
    queueId: input.queueId,
    summary: `Deleted ${before.name || before.shopName} at ${before.shopName}`,
  });
}

export const adminDeleteQueue = onCall<DeleteQueueRequest, Promise<void>>(
  (request: CallableRequest<DeleteQueueRequest>) =>
    performAdminDeleteQueue(db, requirePlatformAdmin(request), request.data),
);
