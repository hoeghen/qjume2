import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { contactRef, holderKeyFor } from './tickets.js';
import type { Ticket, TicketContact } from '../../../src/types/index.js';

/**
 * Moving a place in line from Safari into the Home Screen app, on one iPhone.
 *
 * The two share no storage at all — not the ticket memory, not the anonymous
 * sign-in that owns the ticket — and the web offers no device identifier to
 * join them by. So Safari puts a long single-use token on the clipboard and
 * registers its hash here; the installed app pastes it and claims the ticket.
 *
 * Deliberately not the resume code: that is two characters, built to be read
 * aloud over a counter, and guessable by design. This token is 128+ random
 * bits from the device's own crypto, expires within the hour, and works once.
 */

/** Long enough to install the app and open it, short enough to go stale. */
export const TRANSFER_TTL_MS = 60 * 60 * 1000;
/** base64url of 16 random bytes is 22 characters; refuse anything weaker. */
const MIN_TOKEN_LENGTH = 22;

export function hashTransferToken(ticketId: string, token: string): string {
  return createHash('sha256').update(`${ticketId}:${token}`).digest('hex');
}

export interface StartTransferRequest {
  shopId: string;
  queueId: string;
  ticketId: string;
  token: string;
}

/** Register a handover token for the caller's own ticket. */
export async function performStartTransfer(
  firestore: Firestore,
  caller: { uid: string },
  input: StartTransferRequest,
  now: number = Date.now(),
): Promise<{ expiresAt: number }> {
  const { shopId, queueId, ticketId, token } = input;
  if (!shopId || !queueId || !ticketId || typeof token !== 'string') {
    throw fail('invalid-argument', 'ticket-not-found', 'shopId, queueId, ticketId and token are required.');
  }
  if (token.length < MIN_TOKEN_LENGTH) {
    throw fail('invalid-argument', 'ticket-not-found', 'Transfer token is too short.');
  }

  const ref = contactRef(firestore, shopId, queueId, ticketId);
  const contact = (await ref.get()).data() as TicketContact | undefined;
  if (!contact) throw fail('not-found', 'ticket-not-found', 'Ticket not found.');
  const owner = contact.customerUid ?? contact.anonymousId;
  if (owner !== caller.uid) {
    throw fail('permission-denied', 'not-ticket-owner', 'This is not your ticket.');
  }

  const expiresAt = now + TRANSFER_TTL_MS;
  await ref.update({
    transferTokenHash: hashTransferToken(ticketId, token),
    transferExpiresAt: expiresAt,
  });
  logger.info('Ticket transfer started', { shopId, queueId, ticketId });
  return { expiresAt };
}

export interface ClaimTransferRequest {
  shopId: string;
  queueId: string;
  ticketId: string;
  token: string;
}

export interface ClaimTransferResult {
  ticketId: string;
  displayName: string;
}

/**
 * Take over a ticket with a handover token. The caller becomes its holder and
 * the token is spent; the Safari side can no longer act on the ticket.
 */
export async function performClaimTransfer(
  firestore: Firestore,
  caller: { uid: string; isAnonymous: boolean },
  input: ClaimTransferRequest,
  now: number = Date.now(),
): Promise<ClaimTransferResult> {
  const { shopId, queueId, ticketId, token } = input;
  // One vague answer for every miss, so the endpoint says nothing about which
  // part was wrong.
  const notFound = () =>
    fail('not-found', 'ticket-not-found', 'That place could not be moved. Join the queue again here.');
  if (!shopId || !queueId || !ticketId || typeof token !== 'string') throw notFound();

  const ticketRef = firestore.doc(`shops/${shopId}/queues/${queueId}/tickets/${ticketId}`);
  const ref = contactRef(firestore, shopId, queueId, ticketId);
  const ticketsRef = ticketRef.parent;

  const result = await firestore.runTransaction(async (tx: Transaction) => {
    const [ticketSnap, contactSnap, mine] = await Promise.all([
      tx.get(ticketRef),
      tx.get(ref),
      tx.get(
        ticketsRef
          .where('holderKey', '==', holderKeyFor(queueId, caller.uid))
          .where('state', 'in', ['waiting', 'serving'])
          .limit(1),
      ),
    ]);
    const ticket = ticketSnap.data() as Ticket | undefined;
    const contact = contactSnap.data() as TicketContact | undefined;

    if (
      !ticket ||
      !contact?.transferTokenHash ||
      contact.transferTokenHash !== hashTransferToken(ticketId, token) ||
      (contact.transferExpiresAt ?? 0) < now
    ) {
      throw notFound();
    }
    if (ticket.state !== 'waiting' && ticket.state !== 'serving') {
      throw fail('failed-precondition', 'ticket-not-waiting', 'That place in line has already ended.');
    }
    // Already joined again here: keep that one rather than holding two.
    if (!mine.empty && mine.docs[0]?.id !== ticketId) {
      throw fail('already-exists', 'already-in-queue', 'You are already in this queue here.');
    }

    tx.update(ticketRef, { holderKey: holderKeyFor(queueId, caller.uid) });
    tx.update(ref, {
      customerUid: caller.isAnonymous ? null : caller.uid,
      anonymousId: caller.isAnonymous ? caller.uid : null,
      transferTokenHash: null,
      transferExpiresAt: null,
    });
    return { ticketId, displayName: ticket.displayName };
  });

  logger.info('Ticket transfer claimed', { shopId, queueId, ticketId });
  return result;
}

export const startTransfer = onCall<StartTransferRequest, Promise<{ expiresAt: number }>>(
  (request: CallableRequest<StartTransferRequest>) =>
    performStartTransfer(db, requireCaller(request), request.data),
);

export const claimTransfer = onCall<ClaimTransferRequest, Promise<ClaimTransferResult>>(
  (request: CallableRequest<ClaimTransferRequest>) =>
    performClaimTransfer(db, requireCaller(request), request.data),
);
