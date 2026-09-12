import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { requireServeAccess } from '../lib/access.js';
import { generateResumeCode, hashResumeCode } from './resumeCode.js';
import { contactRef } from './tickets.js';
import type { Ticket } from '../../../src/types/index.js';

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

  const ticketRef = firestore.doc(
    `shops/${shopId}/queues/${queueId}/tickets/${ticketId}`,
  );
  await requireServeAccess(firestore, shopId, callerUid);

  const resumeCode = generateResumeCode();

  return firestore.runTransaction(async (tx: Transaction) => {
    const ticketSnap = await tx.get(ticketRef);

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
    tx.set(
      contactRef(firestore, shopId, queueId, ticketId),
      { resumeCodeHash: hashResumeCode(queueId, resumeCode) },
      { merge: true },
    );

    return { resumeCode, displayName: ticket.displayName };
  });
}

export const relinkTicket = onCall<
  RelinkTicketRequest,
  Promise<RelinkTicketResult>
>((request: CallableRequest<RelinkTicketRequest>) =>
  performRelinkTicket(db, requireCaller(request).uid, request.data),
);
