import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { requirePlatformAdmin, type AdminCaller } from '../lib/auth.js';
import { GEOCODING_SECRETS } from '../lib/secrets.js';
import { diffFields, logAdminAction } from './auditLog.js';
import {
  applyQueueUpdate,
  type UpdateQueueRequest,
  type UpdateQueueResult,
} from '../shop/updateQueue.js';

/**
 * Edit any queue's settings, bypassing the owner check.
 *
 * Shares its validation, geocoding and transaction with the owner's own
 * `updateQueue` (`applyQueueUpdate`) — the only difference is who is allowed
 * to call it, which `requirePlatformAdmin` alone decides.
 */
export async function performAdminUpdateQueue(
  firestore: Firestore,
  admin: AdminCaller,
  input: UpdateQueueRequest,
): Promise<UpdateQueueResult> {
  const { before, result } = await applyQueueUpdate(firestore, input, () => {
    // Already authorized by requirePlatformAdmin.
  });

  const changes = diffFields(
    {
      name: before.name,
      address: before.address,
      category: before.category,
      maxSize: before.maxSize,
      avgServiceTimeSeconds: before.avgServiceTimeSeconds,
      noShowPenalty: before.noShowPenalty,
      description: before.description,
    },
    {
      name: input.name.trim(),
      address: input.address.trim(),
      category: input.category,
      maxSize: input.maxSize,
      avgServiceTimeSeconds: input.avgServiceTimeSeconds,
      noShowPenalty: input.noShowPenalty,
      description: input.description?.trim() || null,
    },
  );

  if (Object.keys(changes).length > 0) {
    await logAdminAction(firestore, null, {
      action: 'queue.update',
      adminUid: admin.uid,
      adminEmail: admin.email,
      shopId: input.shopId,
      queueId: input.queueId,
      summary: `Edited ${before.name} at ${before.shopName}`,
      changes,
    });
  }

  return result;
}

export const adminUpdateQueue = onCall<UpdateQueueRequest, Promise<UpdateQueueResult>>(
  { secrets: GEOCODING_SECRETS },
  (request: CallableRequest<UpdateQueueRequest>) =>
    performAdminUpdateQueue(db, requirePlatformAdmin(request), request.data),
);
