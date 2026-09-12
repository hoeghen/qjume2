import type { Firestore } from 'firebase-admin/firestore';
import { notifyTicket, type DispatchTarget } from './dispatch.js';
import type { Channels } from './channels.js';

/**
 * The notices that are not about time passing: something happened to a
 * customer's place, and they need to know without opening the app.
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
    {
      title: 'You missed your turn',
      body:
        `${displayName}, you were called at ${shopName} and weren't there, ` +
        `so you've moved back. ${strikesLeft} more and you lose your place.`,
      url: `${baseUrl}/q/${target.shopId}/${target.queueId}`,
    },
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
    {
      title: 'You have left the queue',
      body:
        reason === 'noShows'
          ? `${displayName}, you missed three calls at ${shopName}, so your place has gone.`
          : `${displayName}, ${shopName} has taken you out of the queue.`,
      url: `${baseUrl}/q/${target.shopId}/${target.queueId}`,
    },
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
        {
          title: 'Queue closed',
          body: `${shopName} has closed for now. Sorry — do visit us next time.`,
          url: `${baseUrl}/q/${target.shopId}/${target.queueId}`,
        },
        channels,
      ),
    ),
  );
}
