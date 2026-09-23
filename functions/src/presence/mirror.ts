import { onValueWritten } from 'firebase-functions/v2/database';
import { logger } from 'firebase-functions';
import { db } from '../lib/admin.js';
import { nextStatusForPresence } from './transition.js';
import type { Queue } from '../../../src/types/index.js';

/**
 * Mirror a shop device's presence into the queue's status.
 *
 * Firestore has no native presence, so the documented workaround is to report
 * connection state to Realtime Database — whose `onDisconnect` fires server
 * side even when a device vanishes without warning — and mirror it across.
 * That is the only thing RTDB is used for in this app.
 *
 * The rule is narrow on purpose: `open` becomes `unavailable` when the last
 * device disconnects, and back again when one returns. A queue that is paused,
 * draining or closed is left exactly as the owner set it — losing a connection
 * must never quietly reopen a queue somebody deliberately shut.
 *
 * `region` is pinned rather than left at the 2nd-gen default (`us-central1`):
 * an RTDB trigger can only attach to a database instance in its own region,
 * and this project's Realtime Database lives in `europe-west1` — the deploy
 * otherwise fails outright ("pattern cannot match any databases in region
 * us-central1"). The callables elsewhere in this project carry no such
 * constraint, so this is set here alone rather than globally, which would
 * force every already-deployed function through a needless region move.
 */
export const mirrorPresence = onValueWritten(
  { ref: '/status/{shopId}/{queueId}', region: 'europe-west1' },
  async (event) => {
    const { shopId, queueId } = event.params;
    const online = event.data.after.exists() && event.data.after.hasChildren();

    const queueRef = db.doc(`shops/${shopId}/queues/${queueId}`);

    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(queueRef);
        const queue = snap.data() as Queue | undefined;
        if (!queue) return;

        const next = nextStatusForPresence(queue.status, online);
        if (next) tx.update(queueRef, { status: next });
      });
    } catch (error) {
      logger.error('Failed to mirror presence', {
        shopId,
        queueId,
        online,
        reason: String(error),
      });
    }
  },
);
