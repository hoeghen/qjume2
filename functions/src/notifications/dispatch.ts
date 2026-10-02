import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { contactRef } from '../queue/tickets.js';
import { decidePositionMilestone, waitMinutesFor } from './milestones.js';
import { fcmPush } from './fcm.js';
import { resendEmail } from './email.js';
import {
  recordingChannels,
  tokenTail,
  type Channels,
  type Notice,
} from './channels.js';
import { DEFAULT_CONTACT_LOCALE, messagesFor, queueUrl } from './messages.js';
import type {
  ContactLocale,
  Queue,
  Ticket,
  TicketContact,
} from '../../../src/types/index.js';

export interface DispatchTarget {
  shopId: string;
  queueId: string;
  ticketId: string;
}


export function channelsFromEnv(env = process.env): Channels {
  const key = env['EMAIL_API_KEY'];
  const from = env['EMAIL_FROM'];
  if (key && from) {
    return { push: fcmPush, email: resendEmail(key, from) };
  }
  // No email provider configured. Push still works; email quietly does not,
  // which is why this is loud in the log rather than silent.
  if (!env['FIRESTORE_EMULATOR_HOST']) {
    logger.warn(
      'EMAIL_API_KEY and EMAIL_FROM are unset — customers who cannot receive ' +
        'push will get nothing. See CLAUDE.md on iOS.',
    );
  }
  return {
    push: fcmPush,
    email: {
      name: 'none',
      async send() {
        /* nothing configured */
      },
    },
  };
}

/**
 * Send one notice to whoever holds a ticket, by every channel available.
 *
 * Both channels are tried rather than falling through, because there is no
 * reliable way to know a push was seen: iOS delivery is patchy even once
 * granted, and a customer who never installed the PWA gets nothing at all.
 * A duplicate is a far smaller harm than a missed turn.
 */
export async function notifyTicket(
  firestore: Firestore,
  target: DispatchTarget,
  /** Written once the contact is read, in the language stored on it. */
  compose: (locale: ContactLocale) => Notice,
  channels: Channels,
): Promise<void> {
  const ref = contactRef(
    firestore,
    target.shopId,
    target.queueId,
    target.ticketId,
  );
  const contact = (await ref.get()).data() as TicketContact | undefined;
  if (!contact) {
    logger.warn('Notification skipped: ticket has no contact record', {
      ...target,
      title: compose(DEFAULT_CONTACT_LOCALE).title,
    });
    return;
  }

  const locale = contact.locale ?? DEFAULT_CONTACT_LOCALE;
  const notice = compose(locale);

  // One line per notice, before anything is sent, so a notice that reached
  // no channel at all is visible as exactly that rather than as silence.
  logger.info('Notifying ticket', {
    ...target,
    title: notice.title,
    locale,
    pushTokens: contact.fcmTokens.map(tokenTail),
    hasEmail: Boolean(contact.email),
  });

  const jobs: Promise<unknown>[] = [];

  if (contact.fcmTokens.length > 0) {
    jobs.push(
      channels.push
        .send(contact.fcmTokens, notice)
        .then(async ({ staleTokens }) => {
          if (staleTokens.length > 0) {
            logger.info('Forgetting stale push tokens', {
              ...target,
              tokens: staleTokens.map(tokenTail),
            });
            await ref.update({
              fcmTokens: FieldValue.arrayRemove(...staleTokens),
            });
          }
        }),
    );
  }

  if (contact.email) {
    jobs.push(channels.email.send(contact.email, notice));
  }

  // One channel failing must not take the other down with it.
  const results = await Promise.allSettled(jobs);
  for (const result of results) {
    if (result.status === 'rejected') {
      logger.warn('Notification channel failed', {
        ticketId: target.ticketId,
        reason: String(result.reason),
      });
    }
  }
}

export interface MilestoneSweepOptions {
  shopId: string;
  queueId: string;
  queue: Queue;
  activeStations: number;
  baseUrl: string;
  channels?: Channels;
}

/**
 * Recalculate every waiting ticket's estimate and send whatever milestone that
 * advance has newly crossed.
 *
 * Runs after the `callNext` transaction has committed, never inside it: a
 * transaction body can be retried, and a retried side effect is a duplicate
 * notification. The cost is that a crash between commit and dispatch loses
 * that round of alerts — acceptable, because the live position screen is
 * always correct regardless.
 */
export async function sweepMilestones(
  firestore: Firestore,
  options: MilestoneSweepOptions,
): Promise<number> {
  const { shopId, queueId, queue, activeStations, baseUrl } = options;
  const channels = options.channels ?? channelsFromEnv();

  const waiting = await firestore
    .collection(`shops/${shopId}/queues/${queueId}/tickets`)
    .where('state', '==', 'waiting')
    .orderBy('position')
    .limit(50)
    .get();

  const serviceTime =
    queue.observedServiceTimeSeconds ?? queue.avgServiceTimeSeconds;

  let sent = 0;
  // Every waiting ticket's decision, logged once at the end: "why didn't I get
  // an alert" is almost always answered by one of these rows (no tokens, the
  // milestone was already dispatched, or the estimate hadn't crossed one).
  const decisions: Record<string, unknown>[] = [];

  await Promise.all(
    waiting.docs.map(async (doc, index) => {
      const ticket = doc.data() as Ticket;
      const ref = contactRef(firestore, shopId, queueId, doc.id);
      const contact = (await ref.get()).data() as TicketContact | undefined;
      if (!contact) {
        decisions.push({ ticketId: doc.id, peopleAhead: index, contact: false });
        return;
      }

      const target = { shopId, queueId, ticketId: doc.id };

      const minutes = waitMinutesFor(index, serviceTime, activeStations);
      const decision = decidePositionMilestone(index, contact.dispatchedPositions);
      decisions.push({
        ticketId: doc.id,
        peopleAhead: index,
        waitMinutes: minutes,
        pushTokens: contact.fcmTokens.length,
        hasEmail: Boolean(contact.email),
        alreadyDispatched: contact.dispatchedPositions,
        send: decision.send,
      });

      if (decision.send === null) return;

      // Marked before sending: a duplicate alert is a nuisance, but a crash
      // mid-send that leaves it unmarked would fire the same one again on the
      // next advance, and again after that.
      await ref.update({
        dispatchedPositions: FieldValue.arrayUnion(...decision.dispatched),
      });

      await notifyTicket(
        firestore,
        target,
        (locale) => ({
          ...messagesFor(locale).position(ticket.displayName, queue.shopName, index, minutes),
          url: queueUrl(baseUrl, target, locale),
        }),
        channels,
      );
      sent += 1;
    }),
  );

  logger.info('Milestone sweep', {
    shopId,
    queueId,
    serviceTimeSeconds: serviceTime,
    activeStations,
    waiting: waiting.size,
    sent,
    decisions,
  });

  return sent;
}

/** Exposed so tests can capture what would have been sent. */
export { recordingChannels };
