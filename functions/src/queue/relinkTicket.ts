import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { generateResumeCode, hashResumeCode } from './resumeCode.js';
import type { Shop, Ticket } from '../../../src/types/index.js';

export interface RelinkTicketRequest {
  shopId: string;
  queueId: string;
  ticketId: string;
}

export interface RelinkTicketResult {
  /** Read out to the customer, who enters it on their new device. */
  resumeCode: string;
  displayName: string;
}

/**
 * The safety net for a customer who lost their phone and never saved a resume
 * code (PRD 4.8). The owner finds their ticket by display name and issues a
 * fresh code; the old one stops working.
 *
 * This is the shop half only. Phase 4 adds the customer half — entering the
 * code on a new device to reclaim the ticket.
 */
export async function performRelinkTicket(
  firestore: Firestore,
  callerUid: string,
  input: RelinkTicketRequest,
): Promise<RelinkTicketResult> {
  const { shopId, queueId, ticketId } = input;
  if (!shopId || !queueId || !ticketId) {
    throw fail(
      'invalid-argument',
      'ticket-not-found',
      'shopId, queueId and ticketId are required.',
    );
  }

  const shopRef = firestore.doc(`shops/${shopId}`);
  const ticketRef = firestore.doc(
    `shops/${shopId}/queues/${queueId}/tickets/${ticketId}`,
  );
  const resumeCode = generateResumeCode();

  return firestore.runTransaction(async (tx: Transaction) => {
    const [shopSnap, ticketSnap] = await Promise.all([
      tx.get(shopRef),
      tx.get(ticketRef),
    ]);

    const shop = shopSnap.data() as Shop | undefined;
    if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');
    if (shop.ownerUid !== callerUid) {
      throw fail(
        'permission-denied',
        'not-shop-owner',
        'Only the shop owner can re-link a ticket.',
      );
    }

    const ticket = ticketSnap.data() as Ticket | undefined;
    if (!ticket) {
      throw fail('not-found', 'ticket-not-found', 'Ticket not found.');
    }
    if (ticket.state !== 'waiting' && ticket.state !== 'serving') {
      throw fail(
        'failed-precondition',
        'ticket-not-waiting',
        'This ticket is no longer active.',
      );
    }

    // Issuing a new code invalidates the old one: whoever held it can no
    // longer claim this ticket.
    tx.update(ticketRef, {
      resumeCodeHash: hashResumeCode(queueId, resumeCode),
    });

    return { resumeCode, displayName: ticket.displayName };
  });
}

export const relinkTicket = onCall<
  RelinkTicketRequest,
  Promise<RelinkTicketResult>
>((request: CallableRequest<RelinkTicketRequest>) =>
  performRelinkTicket(db, requireCaller(request).uid, request.data),
);
