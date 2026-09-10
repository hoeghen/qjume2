import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import {
  FieldValue,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import type { Ticket } from '../../../src/types/index.js';

export interface LeaveQueueRequest {
  shopId: string;
  queueId: string;
  ticketId: string;
}

/**
 * A customer leaving of their own accord. Distinct from `removeTicket`, which
 * is the shop ejecting someone: the resulting states differ (`left` vs
 * `removed`) so analytics can tell voluntary exits from ejections.
 */
export async function performLeaveQueue(
  firestore: Firestore,
  caller: { uid: string },
  input: LeaveQueueRequest,
): Promise<{ ok: true }> {
  {
    const { shopId, queueId, ticketId } = input;

    if (!shopId || !queueId || !ticketId) {
      throw fail(
        'invalid-argument',
        'ticket-not-found',
        'shopId, queueId and ticketId are required.',
      );
    }

    const queueRef = firestore.doc(`shops/${shopId}/queues/${queueId}`);
    const ticketRef = queueRef.collection('tickets').doc(ticketId);

    await firestore.runTransaction(async (tx: Transaction) => {
      const snap = await tx.get(ticketRef);
      const ticket = snap.data() as Ticket | undefined;
      if (!ticket) {
        throw fail('not-found', 'ticket-not-found', 'Ticket not found.');
      }

      const owner = ticket.customerUid ?? ticket.anonymousId;
      if (owner !== caller.uid) {
        throw fail(
          'permission-denied',
          'not-ticket-owner',
          'This is not your ticket.',
        );
      }

      // Already served, removed or left — nothing to do, and nothing to
      // decrement.
      if (ticket.state !== 'waiting' && ticket.state !== 'serving') {
        throw fail(
          'failed-precondition',
          'ticket-not-waiting',
          'This ticket is no longer active.',
        );
      }

      tx.update(ticketRef, { state: 'left', station: null });

      if (ticket.state === 'waiting') {
        tx.update(queueRef, { waitingCount: FieldValue.increment(-1) });
      }
      if (ticket.state === 'serving' && ticket.station) {
        tx.update(queueRef.collection('stations').doc(ticket.station), {
          currentTicketId: null,
        });
      }
    });

    return { ok: true } as const;
  }
}

export const leaveQueue = onCall<LeaveQueueRequest, Promise<{ ok: true }>>(
  (request: CallableRequest<LeaveQueueRequest>) =>
    performLeaveQueue(db, requireCaller(request), request.data),
);
