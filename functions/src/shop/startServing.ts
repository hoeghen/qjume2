import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { requireServeAccess } from '../lib/access.js';
import { nextStatusForServing } from '../../../src/lib/queue/presence.js';
import type { Queue, Station } from '../../../src/types/index.js';

export interface StartServingRequest {
  shopId: string;
  queueId: string;
  stationId: string;
}

/**
 * Mark a station as actively serving.
 *
 * Replaces the old connection-based heartbeat (RTDB `onDisconnect`): that
 * flipped a queue offline the instant a socket dropped, which punished a
 * locked phone or a brief backgrounding as harshly as a dead device. This is
 * a deliberate signal instead — the client calls it once, automatically, the
 * moment a station is known on the Serve screen (ServingScreen.tsx), rather
 * than requiring a second tap on top of navigating there. Nothing about
 * closing a tab or losing a connection changes it after that: only this
 * call, `stopServing`, or hours of silence caught by `sweepAbandonedQueues`
 * change a station's serving state.
 *
 * Reopens the queue if it was `unavailable` and nothing else has claimed it
 * shut in the meantime; leaves `paused`, `drainMode` and `closed` exactly as
 * the owner set them (`nextStatusForServing`).
 */
export async function performStartServing(
  firestore: Firestore,
  callerUid: string,
  input: StartServingRequest,
): Promise<void> {
  const { shopId, queueId, stationId } = input;
  if (!shopId || !queueId || !stationId) {
    throw fail(
      'invalid-argument',
      'station-not-found',
      'shopId, queueId and stationId are required.',
    );
  }

  await requireServeAccess(firestore, shopId, callerUid);

  const queueRef = firestore.doc(`shops/${shopId}/queues/${queueId}`);
  const stationRef = queueRef.collection('stations').doc(stationId);

  await firestore.runTransaction(async (tx: Transaction) => {
    const [queueSnap, stationSnap] = await Promise.all([
      tx.get(queueRef),
      tx.get(stationRef),
    ]);

    const queue = queueSnap.data() as Queue | undefined;
    if (!queue) throw fail('not-found', 'queue-not-found', 'Queue not found.');

    const station = stationSnap.data() as Station | undefined;
    if (!station) {
      throw fail('not-found', 'station-not-found', 'Station not found.');
    }

    tx.update(stationRef, { serving: true });

    const queueUpdate: Record<string, unknown> = {
      // Counts as activity: a station that starts serving right after a long
      // quiet spell must not be swept as abandoned before it has even had a
      // chance to call anyone.
      lastServedAt: Date.now(),
    };
    const next = nextStatusForServing(queue.status, true);
    if (next) queueUpdate['status'] = next;
    tx.update(queueRef, queueUpdate);
  });
}

export const startServing = onCall<StartServingRequest, Promise<void>>(
  (request: CallableRequest<StartServingRequest>) =>
    performStartServing(db, requireCaller(request).uid, request.data),
);
