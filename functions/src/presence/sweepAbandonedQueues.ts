import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import type { Queue, Station } from '../../../src/types/index.js';

/**
 * How long an `open` queue may sit with nobody having tapped "Stop serving"
 * before the server gives up and assumes the device is simply gone — a dead
 * battery, a killed tab, a network that never comes back. There is no click
 * to observe in that case, which is exactly why this exists: `startServing`
 * and `stopServing` are the normal path, and this is the backstop for when
 * neither one ever fires again.
 *
 * Deliberately long. This is not a responsiveness knob — it exists only to
 * catch a genuinely abandoned queue, never a quiet stretch or a lock screen,
 * so it should never trip during ordinary use.
 */
export const ABANDONED_QUEUE_HOURS = 4;
const ABANDONED_QUEUE_MS = ABANDONED_QUEUE_HOURS * 60 * 60 * 1000;

async function sweepCandidate(
  firestore: Firestore,
  snap: QueryDocumentSnapshot,
  cutoff: number,
): Promise<void> {
  try {
    await firestore.runTransaction(async (tx) => {
      const stationsRef = snap.ref.collection('stations');
      const [queueSnap, stationsSnap] = await Promise.all([
        tx.get(snap.ref),
        tx.get(stationsRef),
      ]);

      const queue = queueSnap.data() as Queue | undefined;
      if (!queue || queue.status !== 'open') return;
      // Re-checked inside the transaction: a "Start serving" tap between the
      // query above and now must win over a stale read.
      const lastServedAt = queue.lastServedAt;
      if (lastServedAt !== null && lastServedAt >= cutoff) return;

      tx.update(snap.ref, { status: 'unavailable' });
      for (const stationDoc of stationsSnap.docs) {
        if ((stationDoc.data() as Station).serving) {
          tx.update(stationDoc.ref, { serving: false });
        }
      }
    });
  } catch (error) {
    logger.error('Failed to sweep an abandoned queue', {
      queuePath: snap.ref.path,
      reason: String(error),
    });
  }
}

/**
 * Catch a queue that `startServing`/`stopServing` will never hear from again.
 *
 * Firestore has no way to notice "time passed with nothing happening" on its
 * own — every other transition here is triggered by an event, but this one
 * only exists because an event stopped arriving. A periodic sweep is the only
 * way to detect that at all.
 *
 * Two queries because Firestore cannot combine an equality filter with a
 * range filter on a different field into one that also matches a missing
 * comparison: a queue that was opened directly (its `lastServedAt` still
 * `null`, because no station has ever started serving it) would never match
 * `lastServedAt < cutoff`, since Firestore's range filters skip `null`
 * outright.
 *
 * `now` is a parameter rather than read internally so a test can simulate
 * four hours passing without an actual clock or a mocked global `Date`.
 */
export async function performSweepAbandonedQueues(
  firestore: Firestore,
  now: number = Date.now(),
): Promise<number> {
  const cutoff = now - ABANDONED_QUEUE_MS;

  const [stale, neverServed] = await Promise.all([
    firestore
      .collectionGroup('queues')
      .where('status', '==', 'open')
      .where('lastServedAt', '<', cutoff)
      .get(),
    firestore
      .collectionGroup('queues')
      .where('status', '==', 'open')
      .where('lastServedAt', '==', null)
      .get(),
  ]);

  const candidates = new Map(
    [...stale.docs, ...neverServed.docs].map((d) => [d.ref.path, d]),
  );

  await Promise.all(
    [...candidates.values()].map((snap) => sweepCandidate(firestore, snap, cutoff)),
  );
  return candidates.size;
}

export const sweepAbandonedQueues = onSchedule('every 30 minutes', async () => {
  await performSweepAbandonedQueues(db);
});
