import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { hashResumeCode } from './resumeCode.js';
import { contactRef, holderKeyFor } from './tickets.js';
import {
  TICKET_CONTACT_DOC,
  type Ticket,
  type TicketContact,
} from '../../../src/types/index.js';

export interface ClaimTicketRequest {
  shopId: string;
  queueId: string;
  resumeCode: string;
}

export interface ClaimTicketResult {
  ticketId: string;
  displayName: string;
  number: number;
}

/**
 * Reclaim a ticket on another device using its resume code.
 *
 * The customer half of PRD 4.8. Codes are scoped per queue and stored only as
 * a hash, so this looks the code up by hashing what was typed rather than by
 * reading anything back. A walk-in with no account can claim their ticket this
 * way too, which is the only route they have onto a phone.
 *
 * Claiming transfers the ticket: the new device becomes its holder, and
 * whatever device held it before can no longer act on it.
 */
export async function performClaimTicket(
  firestore: Firestore,
  caller: { uid: string; isAnonymous: boolean },
  input: ClaimTicketRequest,
): Promise<ClaimTicketResult> {
  const { shopId, queueId } = input;
  const code = input.resumeCode?.trim().toUpperCase();
  if (!shopId || !queueId || !code) {
    throw fail(
      'invalid-argument',
      'ticket-not-found',
      'shopId, queueId and resumeCode are required.',
    );
  }

  const ticketsRef = firestore
    .doc(`shops/${shopId}/queues/${queueId}`)
    .collection('tickets');
  const wanted = hashResumeCode(queueId, code);

  // The hash lives on each ticket's private document, so the lookup is a
  // collection group query scoped to this queue's tickets.
  const matches = await firestore
    .collectionGroup('private')
    .where('resumeCodeHash', '==', wanted)
    .limit(2)
    .get();

  const match = matches.docs.find(
    (d) => d.ref.parent.parent?.parent.path === ticketsRef.path,
  );
  if (!match) {
    // Deliberately vague: a precise answer would let someone probe for valid
    // codes.
    throw fail(
      'not-found',
      'ticket-not-found',
      'That code does not match a ticket in this queue.',
    );
  }

  const ticketRef = match.ref.parent.parent;
  if (!ticketRef) {
    throw fail('not-found', 'ticket-not-found', 'Ticket not found.');
  }

  return firestore.runTransaction(async (tx: Transaction) => {
    const [ticketSnap, contactSnap] = await Promise.all([
      tx.get(ticketRef),
      tx.get(match.ref),
    ]);

    const ticket = ticketSnap.data() as Ticket | undefined;
    if (!ticket) {
      throw fail('not-found', 'ticket-not-found', 'Ticket not found.');
    }
    if (ticket.state !== 'waiting' && ticket.state !== 'serving') {
      throw fail(
        'failed-precondition',
        'ticket-not-waiting',
        'That ticket is no longer active.',
      );
    }

    const held = contactSnap.data() as TicketContact | undefined;
    // Re-check inside the transaction: a re-link could have replaced the code
    // between the lookup and here.
    if (held?.resumeCodeHash !== wanted) {
      throw fail(
        'not-found',
        'ticket-not-found',
        'That code does not match a ticket in this queue.',
      );
    }

    tx.update(ticketRef, { holderKey: holderKeyFor(queueId, caller.uid) });
    tx.set(
      contactRef(firestore, shopId, queueId, ticketRef.id),
      {
        customerUid: caller.isAnonymous ? null : caller.uid,
        anonymousId: caller.isAnonymous ? caller.uid : null,
      },
      { merge: true },
    );

    return {
      ticketId: ticketRef.id,
      displayName: ticket.displayName,
      number: ticket.number,
    };
  });
}

export const claimTicket = onCall<ClaimTicketRequest, Promise<ClaimTicketResult>>(
  (request: CallableRequest<ClaimTicketRequest>) =>
    performClaimTicket(db, requireCaller(request), request.data),
);

/** Exposed for the security rules test, which asserts the path stays private. */
export const CONTACT_DOC = TICKET_CONTACT_DOC;
