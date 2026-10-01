import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { contactRef } from './tickets.js';
import { tokenTail } from '../notifications/channels.js';
import type { TicketContact } from '../../../src/types/index.js';

export interface UnregisterPushTokenRequest {
  shopId: string;
  queueId: string;
  ticketId: string;
  token: string;
}

/**
 * Detach a push token from a ticket — the other half of `registerPushToken`,
 * for "Disable notifications" once someone has changed their mind.
 *
 * Scoped to this one ticket's token list, not the browser's subscription as
 * a whole: the same device's token can be registered against more than one
 * ticket (joining two queues from one phone), and disabling notifications
 * for one of them must not silently kill the other.
 */
export async function performUnregisterPushToken(
  firestore: Firestore,
  caller: { uid: string },
  input: UnregisterPushTokenRequest,
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

  await ref.update({ fcmTokens: FieldValue.arrayRemove(token) });
  logger.info('Push token unregistered', {
    shopId,
    queueId,
    ticketId,
    token: tokenTail(token),
    tokensBefore: contact.fcmTokens.length,
  });
  return { ok: true } as const;
}

export const unregisterPushToken = onCall<
  UnregisterPushTokenRequest,
  Promise<{ ok: true }>
>((request: CallableRequest<UnregisterPushTokenRequest>) =>
  performUnregisterPushToken(db, requireCaller(request), request.data),
);
