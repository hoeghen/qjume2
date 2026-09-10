import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import {
  FieldValue,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { generateResumeCode, hashResumeCode } from './resumeCode.js';
import { nextPosition } from './positions.js';
import {
  FREE_TIER_LIMITS,
  type Queue,
  type Shop,
  type Ticket,
} from '../../../src/types/index.js';

export interface AddWalkInRequest {
  shopId: string;
  queueId: string;
  displayName: string;
}

export interface AddWalkInResult {
  ticketId: string;
  number: number;
  /** Written down or read out; the customer has no device to show it on. */
  resumeCode: string;
}

/**
 * The owner adding someone who has no smartphone (PRD 4.4). They take the same
 * place in the same queue as everyone else — no separate walk-in line, and no
 * preferential treatment. The in-shop monitor is their notification channel.
 *
 * Permitted while the queue is draining, unlike `joinQueue`. See the decisions
 * section of CLAUDE.md.
 */
export async function performAddWalkIn(
  firestore: Firestore,
  callerUid: string,
  input: AddWalkInRequest,
): Promise<AddWalkInResult> {
  const { shopId, queueId } = input;
  const displayName = input.displayName?.trim();
  if (!shopId || !queueId || !displayName) {
    throw fail(
      'invalid-argument',
      'queue-not-found',
      'shopId, queueId and displayName are required.',
    );
  }

  const shopRef = firestore.doc(`shops/${shopId}`);
  const queueRef = firestore.doc(`shops/${shopId}/queues/${queueId}`);
  const ticketRef = queueRef.collection('tickets').doc();
  const resumeCode = generateResumeCode();

  const { number } = await firestore.runTransaction(async (tx: Transaction) => {
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
        'Only the shop owner can add a walk-in.',
      );
    }

    const queue = queueSnap.data() as Queue | undefined;
    if (!queue) throw fail('not-found', 'queue-not-found', 'Queue not found.');

    // A draining queue still admits walk-ins. Drain stops *remote* joiners:
    // someone standing at the counter while the shop finishes up can still be
    // added by staff, which is a judgement the person behind the till is
    // making in the moment. `joinQueue` remains open-only.
    if (queue.status !== 'open' && queue.status !== 'drainMode') {
      throw fail(
        'failed-precondition',
        'queue-not-accepting',
        'This queue is not accepting new joiners.',
      );
    }
    if (queue.waitingCount >= queue.maxSize) {
      throw fail('resource-exhausted', 'queue-full', 'This queue is full.');
    }
    if (
      shop.plan === 'free' &&
      queue.waitingCount >= FREE_TIER_LIMITS.maxWaiting
    ) {
      throw fail(
        'resource-exhausted',
        'free-tier-waiting-limit',
        'This queue has reached its limit.',
      );
    }

    const issuedNumber = queue.lastIssuedNumber + 1;
    const position = nextPosition(queue.lastPosition);

    const ticket: Ticket = {
      displayName,
      number: issuedNumber,
      position,
      state: 'waiting',
      noShowCount: 0,
      station: null,
      joinedAt: Date.now(),
      calledAt: null,
      // Nobody holds this ticket on a device yet. The resume code is what lets
      // them claim it later if they do have a phone after all.
      customerUid: null,
      anonymousId: null,
      resumeCodeHash: hashResumeCode(queueId, resumeCode),
      email: null,
      phone: null,
      fcmTokens: [],
      dispatchedMilestones: [],
    };

    tx.set(ticketRef, ticket);
    tx.update(queueRef, {
      lastIssuedNumber: issuedNumber,
      lastPosition: position,
      waitingCount: FieldValue.increment(1),
    });

    return { number: issuedNumber };
  });

  return { ticketId: ticketRef.id, number, resumeCode };
}

export const addWalkIn = onCall<AddWalkInRequest, Promise<AddWalkInResult>>(
  (request: CallableRequest<AddWalkInRequest>) =>
    performAddWalkIn(db, requireCaller(request).uid, request.data),
);
