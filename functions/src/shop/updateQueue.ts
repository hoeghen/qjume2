import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { geocodeAddress } from '../geocoding/index.js';
import {
  QUEUE_CATEGORIES,
  type NoShowPenalty,
  type Queue,
  type QueueCategory,
  type QueueSchedule,
  type Shop,
} from '../../../src/types/index.js';

export interface UpdateQueueRequest {
  shopId: string;
  queueId: string;
  name: string;
  address: string;
  category: QueueCategory;
  maxSize: number;
  avgServiceTimeSeconds: number;
  noShowPenalty: NoShowPenalty;
  schedule?: QueueSchedule | null;
  description?: string | null;
}

export interface UpdateQueueResult {
  /** Set when the address changed and was re-placed. */
  geocoded: { lat: number; lng: number; formatted: string } | null;
}

const PENALTIES: NoShowPenalty[] = ['back', 'back3', 'back5'];

/**
 * Edit a queue's settings.
 *
 * Server-side because the address and its coordinates must not drift apart: a
 * client write could change the address while leaving the old `lat`/`lng`, and
 * the queue would then be discoverable at a place it no longer occupies. The
 * security rules let a client change only `status`.
 */
export async function performUpdateQueue(
  firestore: Firestore,
  callerUid: string,
  input: UpdateQueueRequest,
): Promise<UpdateQueueResult> {
  const { shopId, queueId, category, maxSize, avgServiceTimeSeconds } = input;
  const name = input.name?.trim();
  const address = input.address?.trim();

  if (!shopId || !queueId || !name || !address) {
    throw fail(
      'invalid-argument',
      'queue-not-found',
      'shopId, queueId, name and address are required.',
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
  const queueRef = firestore.doc(`shops/${shopId}/queues/${queueId}`);

  const [shopSnap, queueSnap] = await Promise.all([
    shopRef.get(),
    queueRef.get(),
  ]);
  const shop = shopSnap.data() as Shop | undefined;
  if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');
  if (shop.ownerUid !== callerUid) {
    throw fail(
      'permission-denied',
      'not-shop-owner',
      'Only the shop owner can edit this queue.',
    );
  }
  const existing = queueSnap.data() as Queue | undefined;
  if (!existing) {
    throw fail('not-found', 'queue-not-found', 'Queue not found.');
  }

  // Only pay for a geocode when the address actually changed, or when a
  // previous attempt left the queue unplaced.
  const needsGeocode =
    existing.address !== address || existing.geohash === null;
  const located = needsGeocode
    ? await geocodeAddress(address).catch(() => null)
    : null;

  await firestore.runTransaction(async (tx: Transaction) => {
    const fresh = await tx.get(queueRef);
    if (!fresh.exists) {
      throw fail('not-found', 'queue-not-found', 'Queue not found.');
    }

    const update: Record<string, unknown> = {
      name,
      address,
      category,
      maxSize,
      avgServiceTimeSeconds,
      noShowPenalty: input.noShowPenalty,
      schedule: input.schedule ?? null,
      description: input.description?.trim() || null,
    };

    if (needsGeocode) {
      // A failed lookup clears the coordinates rather than leaving the old
      // ones behind, so the queue drops out of distance results instead of
      // appearing at the previous address.
      update['lat'] = located?.lat ?? null;
      update['lng'] = located?.lng ?? null;
      update['geohash'] = located?.geohash ?? null;
    }

    tx.update(queueRef, update);
  });

  return {
    geocoded: located
      ? { lat: located.lat, lng: located.lng, formatted: located.formatted }
      : null,
  };
}

export const updateQueue = onCall<UpdateQueueRequest, Promise<UpdateQueueResult>>(
  (request: CallableRequest<UpdateQueueRequest>) =>
    performUpdateQueue(db, requireCaller(request).uid, request.data),
);
