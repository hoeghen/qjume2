import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { channelsFromEnv } from '../notifications/dispatch.js';
import { notifyQueueClosed } from '../notifications/events.js';
import { baseUrl } from '../lib/config.js';
import type { Channels } from '../notifications/channels.js';
import type { Queue, Shop, Ticket } from '../../../src/types/index.js';

/**
 * `drain` stops new joiners and keeps serving those already waiting.
 * `hard` clears the queue outright. The owner chooses at runtime, when they
 * can see how many people are still waiting. See PRD 5.6.
 */
export type CloseMode = 'drain' | 'hard';

export interface CloseQueueRequest {
  shopId: string;
  queueId: string;
  mode: CloseMode;
}

export interface CloseQueueResult {
  /** How many waiting customers were turned away by a hard close. */
  clearedCount: number;
}

/** Firestore caps a transaction at 500 writes; stay well clear of it. */
const MAX_CLEARED_PER_PASS = 400;

export async function performCloseQueue(
  firestore: Firestore,
  callerUid: string,
  input: CloseQueueRequest,
  /** Overridden by tests so nothing is actually sent. */
  channels: Channels = channelsFromEnv(),
): Promise<CloseQueueResult> {
  const { shopId, queueId, mode } = input;
  if (!shopId || !queueId || (mode !== 'drain' && mode !== 'hard')) {
    throw fail(
      'invalid-argument',
      'queue-not-found',
      'shopId, queueId and a mode of "drain" or "hard" are required.',
    );
  }

  const shopRef = firestore.doc(`shops/${shopId}`);
  const queueRef = firestore.doc(`shops/${shopId}/queues/${queueId}`);
  const ticketsRef = queueRef.collection('tickets');

  const result = await firestore.runTransaction(async (tx: Transaction) => {
    const [shopSnap, queueSnap] = await Promise.all([
      tx.get(shopRef),
      tx.get(queueRef),
    ]);

    const shop = shopSnap.data() as Shop | undefined;
    if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');
    if (shop.ownerUid !== callerUid) {
      throw fail(
        'permission-denied',
        'not-shop-owner',
        'Only the shop owner can close this queue.',
      );
    }
    if (!queueSnap.exists) {
      throw fail('not-found', 'queue-not-found', 'Queue not found.');
    }

    if (mode === 'drain') {
      // Still open to those already holding a ticket, shut to newcomers.
      tx.update(queueRef, { status: 'drainMode' });
      return { clearedCount: 0, cleared: [] as string[], shopName: shop.name };
    }

    const waiting = await tx.get(
      ticketsRef
        .where('state', '==', 'waiting')
        .orderBy('position')
        .limit(MAX_CLEARED_PER_PASS),
    );

    for (const doc of waiting.docs) {
      const ticket = doc.data() as Ticket;
      if (ticket.state !== 'waiting') continue;
      // Phase 5 sends these customers a "queue closed" notification; the state
      // change is what that dispatch will key off.
      tx.update(doc.ref, { state: 'removed', station: null });
    }

    tx.update(queueRef, {
      status: 'closed',
      waitingCount: 0,
      currentNumber: 0,
    });

    return {
      clearedCount: waiting.size,
      cleared: waiting.docs.map((d) => d.id),
      shopName: (queueSnap.data() as Queue).shopName,
    };
  });

  // After the commit, never inside it: a retried transaction body would send
  // the same apology twice.
  if (result.cleared.length > 0) {
    try {
      await notifyQueueClosed(
        firestore,
        result.cleared.map((ticketId) => ({ shopId, queueId, ticketId })),
        result.shopName,
        baseUrl(),
        channels,
      );
    } catch {
      // The queue is closed either way; a failed apology must not undo it.
    }
  }

  return { clearedCount: result.clearedCount };
}

export const closeQueue = onCall<CloseQueueRequest, Promise<CloseQueueResult>>(
  (request: CallableRequest<CloseQueueRequest>) =>
    performCloseQueue(db, requireCaller(request).uid, request.data),
);
