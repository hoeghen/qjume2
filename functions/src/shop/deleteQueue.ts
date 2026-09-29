import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import type { Queue, Shop } from '../../../src/types/index.js';

export interface DeleteQueueRequest {
  shopId: string;
  queueId: string;
}

/**
 * Permanently remove one queue: its tickets and stations, everything under
 * `shops/{shopId}/queues/{queueId}`. Takes anyone currently waiting with it —
 * there is no server-only "clear it first" step the way `closeQueue`'s hard
 * mode offers; deleting is deleting, and the owner was warned before calling
 * this.
 *
 * `recursiveDelete` is not a transaction (Firestore has no such thing across
 * an unbounded subtree — see `deleteShop.ts`), so the existence check reads
 * the queue just before deleting it rather than inside a transaction with it.
 *
 * Shared by the owner's own `deleteQueue` and the platform admin's
 * `adminDeleteQueue`, the same split as `applyQueueUpdate` — `authorize` is
 * the only difference.
 */
export async function applyQueueDelete(
  firestore: Firestore,
  input: DeleteQueueRequest,
  authorize: (shop: Shop) => void,
): Promise<{ before: Queue }> {
  const { shopId, queueId } = input;
  if (!shopId || !queueId) {
    throw fail(
      'invalid-argument',
      'queue-not-found',
      'shopId and queueId are required.',
    );
  }

  const shopRef = firestore.doc(`shops/${shopId}`);
  const queueRef = firestore.doc(`shops/${shopId}/queues/${queueId}`);

  const [shopSnap, queueSnap] = await Promise.all([
    shopRef.get(),
    queueRef.get(),
  ]);
  const shop = shopSnap.data() as Shop | undefined;
  if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');
  authorize(shop);

  const existing = queueSnap.data() as Queue | undefined;
  if (!existing) {
    throw fail('not-found', 'queue-not-found', 'Queue not found.');
  }

  await firestore.recursiveDelete(queueRef);

  return { before: existing };
}

export async function performDeleteQueue(
  firestore: Firestore,
  callerUid: string,
  input: DeleteQueueRequest,
): Promise<void> {
  await applyQueueDelete(firestore, input, (shop) => {
    if (shop.ownerUid !== callerUid) {
      throw fail(
        'permission-denied',
        'not-shop-owner',
        'Only the shop owner can delete this queue.',
      );
    }
  });
}

export const deleteQueue = onCall<DeleteQueueRequest, Promise<void>>(
  (request: CallableRequest<DeleteQueueRequest>) =>
    performDeleteQueue(db, requireCaller(request).uid, request.data),
);
