import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import {
  FREE_TIER_LIMITS,
  QUEUE_CATEGORIES,
  type NoShowPenalty,
  type Queue,
  type QueueCategory,
  type QueueSchedule,
  type Shop,
} from '../../../src/types/index.js';

export interface CreateQueueRequest {
  shopId: string;
  name: string;
  address: string;
  category: QueueCategory;
  maxSize: number;
  avgServiceTimeSeconds: number;
  noShowPenalty: NoShowPenalty;
  schedule?: QueueSchedule | null;
  description?: string | null;
}

export interface CreateQueueResult {
  queueId: string;
}

const PENALTIES: NoShowPenalty[] = ['back', 'back3', 'back5'];

/**
 * Create a queue.
 *
 * A Cloud Function rather than a client write because the free-tier "one active
 * queue" limit has to be counted server-side — security rules cannot count a
 * sibling collection. Invariant 5.
 */
export async function performCreateQueue(
  firestore: Firestore,
  callerUid: string,
  input: CreateQueueRequest,
): Promise<CreateQueueResult> {
  const { shopId, name, address, category, maxSize, avgServiceTimeSeconds } =
    input;

  const trimmedName = name?.trim();
  const trimmedAddress = address?.trim();

  if (!shopId || !trimmedName || !trimmedAddress) {
    throw fail(
      'invalid-argument',
      'queue-not-found',
      'shopId, name and address are required.',
    );
  }
  if (!QUEUE_CATEGORIES.includes(category)) {
    throw fail('invalid-argument', 'queue-not-found', 'Unknown category.');
  }
  if (!PENALTIES.includes(input.noShowPenalty)) {
    throw fail('invalid-argument', 'queue-not-found', 'Unknown no-show penalty.');
  }
  if (!Number.isInteger(maxSize) || maxSize < 1) {
    throw fail(
      'invalid-argument',
      'queue-not-found',
      'Maximum queue size must be a positive whole number.',
    );
  }
  if (!Number.isFinite(avgServiceTimeSeconds) || avgServiceTimeSeconds <= 0) {
    throw fail(
      'invalid-argument',
      'queue-not-found',
      'Average service time must be greater than zero.',
    );
  }

  const shopRef = firestore.doc(`shops/${shopId}`);
  const queuesRef = shopRef.collection('queues');
  const queueRef = queuesRef.doc();

  await firestore.runTransaction(async (tx: Transaction) => {
    const shopSnap = await tx.get(shopRef);
    const shop = shopSnap.data() as Shop | undefined;
    if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');
    if (shop.ownerUid !== callerUid) {
      throw fail(
        'permission-denied',
        'not-shop-owner',
        'Only the shop owner can create a queue.',
      );
    }

    if (shop.plan === 'free') {
      const existing = await tx.get(
        queuesRef.limit(FREE_TIER_LIMITS.maxQueues + 1),
      );
      if (existing.size >= FREE_TIER_LIMITS.maxQueues) {
        throw fail(
          'resource-exhausted',
          'free-tier-waiting-limit',
          'The free plan includes one queue.',
        );
      }
    }

    const queue: Queue = {
      name: trimmedName,
      description: input.description?.trim() || null,
      category,
      maxSize,
      address: trimmedAddress,
      // Geocoding lands in Phase 3; the queue is servable before it is
      // discoverable on a map.
      lat: null,
      lng: null,
      geohash: null,
      avgServiceTimeSeconds,
      noShowPenalty: input.noShowPenalty,
      // A new queue is closed until the owner opens it deliberately.
      status: 'closed',
      schedule: input.schedule ?? null,
      currentNumber: 0,
      lastIssuedNumber: 0,
      lastPosition: 0,
      lastServedAt: null,
      waitingCount: 0,
    };

    tx.set(queueRef, queue);
  });

  return { queueId: queueRef.id };
}

export const createQueue = onCall<CreateQueueRequest, Promise<CreateQueueResult>>(
  (request: CallableRequest<CreateQueueRequest>) =>
    performCreateQueue(db, requireCaller(request).uid, request.data),
);
