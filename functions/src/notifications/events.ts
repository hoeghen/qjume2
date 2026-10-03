import type { Firestore } from 'firebase-admin/firestore';
import { notifyTicket, type DispatchTarget } from './dispatch.js';
import { messagesFor, queueUrl } from './messages.js';
import type { Channels } from './channels.js';
import { tillLabel as localTillLabel } from '../../../src/lib/tills.js';

/**
 * The notices that are not about time passing: something happened to a
 * customer's place, and they need to know without opening the app. Worded
 * in messages.ts, in the language stored on each ticket.
 */

export async function notifyBumped(
  firestore: Firestore,
  target: DispatchTarget,
  displayName: string,
  shopName: string,
  baseUrl: string,
  channels: Channels,
  strikesLeft: number,
): Promise<void> {
  await notifyTicket(
    firestore,
    target,
    (locale) => ({
      ...messagesFor(locale).bumped(displayName, shopName, strikesLeft),
      url: queueUrl(baseUrl, target, locale),
    }),
    channels,
  );
}

/**
 * The ticket has just been called to a counter.
 *
 * Sent even though the ticket screen already says so: the person may well be
 * holding a phone they haven't looked at, and this is the one moment that
 * matters. The till is named only when the queue has more than one — with a
 * single counter there is nowhere else to go.
 */
export async function notifyCalled(
  firestore: Firestore,
  target: DispatchTarget,
  displayName: string,
  shopName: string,
  tillLabel: string | null,
  baseUrl: string,
  channels: Channels,
): Promise<void> {
  await notifyTicket(
    firestore,
    target,
    (locale) => ({
      ...messagesFor(locale).turn(
        displayName,
        shopName,
        tillLabel === null ? null : localTillLabel(tillLabel, locale),
      ),
      url: queueUrl(baseUrl, target, locale),
      urgent: true,
    }),
    channels,
  );
}

export async function notifyRemoved(
  firestore: Firestore,
  target: DispatchTarget,
  displayName: string,
  shopName: string,
  baseUrl: string,
  channels: Channels,
  reason: 'noShows' | 'byShop',
): Promise<void> {
  await notifyTicket(
    firestore,
    target,
    (locale) => ({
      ...messagesFor(locale).removed(displayName, shopName, reason),
      url: queueUrl(baseUrl, target, locale),
    }),
    channels,
  );
}

export async function notifyQueueClosed(
  firestore: Firestore,
  targets: DispatchTarget[],
  shopName: string,
  baseUrl: string,
  channels: Channels,
): Promise<void> {
  await Promise.all(
    targets.map((target) =>
      notifyTicket(
        firestore,
        target,
        (locale) => ({
          ...messagesFor(locale).queueClosed(shopName),
          url: queueUrl(baseUrl, target, locale),
        }),
        channels,
      ),
    ),
  );
}
