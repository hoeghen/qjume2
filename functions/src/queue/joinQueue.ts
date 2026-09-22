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
import { contactRef, holderKeyFor } from './tickets.js';
import { nextPosition } from '../../../src/lib/queue/positions.js';
import {
  FREE_TIER_LIMITS,
  type Queue,
  type Shop,
  type Ticket,
  type TicketContact,
} from '../../../src/types/index.js';

export interface JoinQueueRequest {
  shopId: string;
  queueId: string;
  displayName: string;
  email?: string;
  phone?: string;
  /**
   * Set when the join came from the QR code on the in-shop monitor, so the
   * person is standing in front of it.
   *
   * The code is static and unauthenticated, so this is a claim rather than
   * proof — someone could photograph it and join from home. That is accepted:
   * the only thing it unlocks is joining a draining queue, which a member of
   * staff could do for them anyway by adding them as a walk-in.
   */
  atCounter?: boolean;
}

export interface JoinQueueResult {
  ticketId: string;
  number: number;
  /** Shown to the customer once. Only its hash is stored. */
  resumeCode: string;
}

/**
 * An open queue takes anyone. A draining one takes only those already there.
 *
 * That is the same asymmetry as `addWalkIn`: drain mode stops *remote*
 * joiners, not someone standing at the counter. `unavailable` refuses both —
 * the shop's device is offline and could not be told either way.
 */
function acceptsJoiners(queue: Queue, atCounter: boolean): boolean {
  if (queue.status === 'open') return true;
  return atCounter && queue.status === 'drainMode';
}

/**
 * Issue a ticket in a queue.
 *
 * Runs in a transaction because the ticket number and position both derive from
 * the queue document: two people tapping Join at the same instant must not be
 * issued the same number.
 */
export async function performJoinQueue(
  firestore: Firestore,
  caller: { uid: string; isAnonymous: boolean },
  input: JoinQueueRequest,
): Promise<JoinQueueResult> {
  {
    const { shopId, queueId, displayName, email, phone } = input;
    const atCounter = input.atCounter === true;

    const trimmedName = displayName?.trim();
    if (!shopId || !queueId || !trimmedName) {
      throw fail(
        'invalid-argument',
        'queue-not-found',
        'shopId, queueId and displayName are required.',
      );
    }

    const shopRef = firestore.doc(`shops/${shopId}`);
    const queueRef = firestore.doc(`shops/${shopId}/queues/${queueId}`);
    const ticketsRef = queueRef.collection('tickets');
    const ticketRef = ticketsRef.doc();

    const resumeCode = generateResumeCode();

    const { number } = await firestore.runTransaction(async (tx: Transaction) => {
      const [shopSnap, queueSnap] = await Promise.all([
        tx.get(shopRef),
        tx.get(queueRef),
      ]);

      const shop = shopSnap.data() as Shop | undefined;
      if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');

      const queue = queueSnap.data() as Queue | undefined;
      if (!queue) throw fail('not-found', 'queue-not-found', 'Queue not found.');

      // Checked on the live shop doc, not the denormalised copy on the
      // queue — a platform suspension refuses joiners the instant it is
      // set, with nothing for staleness to delay.
      if (shop.suspended) {
        throw fail(
          'failed-precondition',
          'queue-not-accepting',
          'This queue is not accepting new joiners.',
        );
      }

      if (!acceptsJoiners(queue, atCounter)) {
        throw fail(
          'failed-precondition',
          'queue-not-accepting',
          queue.status === 'unavailable'
            ? 'This queue is temporarily unavailable.'
            : 'This queue is not accepting new joiners.',
        );
      }

      // One ticket per customer per queue.
      const existing = await tx.get(
        ticketsRef
          .where('holderKey', '==', holderKeyFor(queueId, caller.uid))
          .where('state', 'in', ['waiting', 'serving'])
          .limit(1),
      );
      if (!existing.empty) {
        throw fail(
          'already-exists',
          'already-in-queue',
          'You are already in this queue.',
        );
      }

      const waitingCount = queue.waitingCount;

      if (waitingCount >= queue.maxSize) {
        throw fail('resource-exhausted', 'queue-full', 'This queue is full.');
      }

      // Enforced here, on the server, not merely hidden in the UI.
      if (shop.plan === 'free' && waitingCount >= FREE_TIER_LIMITS.maxWaiting) {
        throw fail(
          'resource-exhausted',
          'free-tier-waiting-limit',
          'This queue has reached its limit.',
        );
      }

      const issuedNumber = queue.lastIssuedNumber + 1;
      // Always behind everyone waiting, including anyone a penalty just moved.
      const position = nextPosition(queue.lastPosition);

      const ticket: Ticket = {
        displayName: trimmedName,
        number: issuedNumber,
        position,
        state: 'waiting',
        noShowCount: 0,
        station: null,
        joinedAt: Date.now(),
        calledAt: null,
        holderKey: holderKeyFor(queueId, caller.uid),
      };

      // Contact details and the resume code live in a private subcollection,
      // out of reach of the public reads the monitor and position counting
      // depend on.
      const contact: TicketContact = {
        customerUid: caller.isAnonymous ? null : caller.uid,
        anonymousId: caller.isAnonymous ? caller.uid : null,
        resumeCodeHash: hashResumeCode(queueId, resumeCode),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        fcmTokens: [],
        dispatchedMilestones: [],
      };

      tx.set(ticketRef, ticket);
      tx.set(contactRef(firestore, shopId, queueId, ticketRef.id), contact);
      tx.update(queueRef, {
        lastIssuedNumber: issuedNumber,
        lastPosition: position,
        waitingCount: FieldValue.increment(1),
      });

      return { number: issuedNumber };
    });

    return { ticketId: ticketRef.id, number, resumeCode };
  }
}

export const joinQueue = onCall<JoinQueueRequest, Promise<JoinQueueResult>>(
  (request: CallableRequest<JoinQueueRequest>) =>
    performJoinQueue(db, requireCaller(request), request.data),
);
