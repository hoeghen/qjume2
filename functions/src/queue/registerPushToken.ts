import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { contactRef } from './tickets.js';
import type { TicketContact } from '../../../src/types/index.js';

export interface RegisterPushTokenRequest {
  shopId: string;
  queueId: string;
  ticketId: string;
  token: string;
}

/**
 * Attach a push token to a ticket.
 *
 * A Cloud Function rather than a client write because the private half of a
 * ticket is server-write-only — it holds the resume code, and opening it to
 * clients to accept a token would open it to everything else on the document.
 */
export async function performRegisterPushToken(
  firestore: Firestore,
  caller: { uid: string },
  input: RegisterPushTokenRequest,
): Promise<{ ok: true }> {
  const { shopId, queueId, ticketId, token } = input;
  if (!shopId || !queueId || !ticketId || !token) {
    throw fail(
      'invalid-argument',
      'ticket-not-found',
      'shopId, queueId, ticketId and token are required.',
    );
  }

  const ref = contactRef(firestore, shopId, queueId, ticketId);
  const contact = (await ref.get()).data() as TicketContact | undefined;
  if (!contact) {
    throw fail('not-found', 'ticket-not-found', 'Ticket not found.');
  }

  const owner = contact.customerUid ?? contact.anonymousId;
  if (owner !== caller.uid) {
    throw fail(
      'permission-denied',
      'not-ticket-owner',
      'This is not your ticket.',
    );
  }

  // arrayUnion so re-registering on the same device is a no-op rather than a
  // second copy of every alert.
  await ref.update({ fcmTokens: FieldValue.arrayUnion(token) });
  return { ok: true } as const;
}

export const registerPushToken = onCall<
  RegisterPushTokenRequest,
  Promise<{ ok: true }>
>((request: CallableRequest<RegisterPushTokenRequest>) =>
  performRegisterPushToken(db, requireCaller(request), request.data),
);
