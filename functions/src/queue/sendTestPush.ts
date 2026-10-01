import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { baseUrl } from '../lib/config.js';
import { contactRef } from './tickets.js';
import { fcmPush } from '../notifications/fcm.js';
import type {
  PushChannel,
  PushTokenResult,
} from '../notifications/channels.js';
import type { TicketContact } from '../../../src/types/index.js';

export interface SendTestPushRequest {
  shopId: string;
  queueId: string;
  ticketId: string;
  /**
   * Seconds to wait before sending, so there is time to lock the phone or
   * switch apps: a push to a page that is open and visible takes a different
   * path from one to a phone in a pocket, and the pocket is the one that
   * matters.
   */
  delaySeconds?: number;
}

export interface SendTestPushResult {
  results: PushTokenResult[];
}

/** Long enough to lock a phone, short enough to stay well inside a callable's timeout. */
export const MAX_TEST_PUSH_DELAY_SECONDS = 30;

/**
 * Send a test notification to the caller's own ticket.
 *
 * Exists so push can be checked end to end without a second person tapping
 * Next on a real queue. It goes through the same `fcmPush` channel as every
 * real alert, and hands back what FCM said for each token, so the phone that
 * asked can show "FCM accepted it" or the exact error without anyone reading
 * server logs. Only the ticket's owner can ask, and it only ever reaches that
 * ticket's own tokens — the same ones the owner registered themselves.
 */
export async function performSendTestPush(
  firestore: Firestore,
  caller: { uid: string },
  input: SendTestPushRequest,
  push: PushChannel = fcmPush,
  sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<SendTestPushResult> {
  const { shopId, queueId, ticketId } = input;
  if (!shopId || !queueId || !ticketId) {
    throw fail(
      'invalid-argument',
      'ticket-not-found',
      'shopId, queueId and ticketId are required.',
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

  if (contact.fcmTokens.length === 0) {
    logger.info('Test push skipped: ticket has no push tokens', {
      shopId,
      queueId,
      ticketId,
    });
    return { results: [] };
  }

  const delaySeconds = Math.min(
    MAX_TEST_PUSH_DELAY_SECONDS,
    Math.max(0, Math.floor(input.delaySeconds ?? 0)),
  );
  if (delaySeconds > 0) await sleep(delaySeconds * 1000);

  const { staleTokens, results } = await push.send(contact.fcmTokens, {
    title: 'Test notification',
    body: 'Notifications from Qjume are working on this device.',
    url: `${baseUrl()}/q/${shopId}/${queueId}`,
  });

  if (staleTokens.length > 0) {
    await ref.update({ fcmTokens: FieldValue.arrayRemove(...staleTokens) });
  }

  logger.info('Test push sent', {
    shopId,
    queueId,
    ticketId,
    delaySeconds,
    results,
  });

  return { results };
}

export const sendTestPush = onCall<
  SendTestPushRequest,
  Promise<SendTestPushResult>
>(
  // The delay is spent waiting inside the call, so leave room for it.
  { timeoutSeconds: 60 + MAX_TEST_PUSH_DELAY_SECONDS },
  (request: CallableRequest<SendTestPushRequest>) =>
    performSendTestPush(db, requireCaller(request), request.data),
);
