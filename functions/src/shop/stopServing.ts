import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { requireServeAccess } from '../lib/access.js';
import { nextStatusForServing } from '../../../src/lib/queue/presence.js';
import type { Queue, Station } from '../../../src/types/index.js';

export interface StopServingRequest {
  shopId: string;
  queueId: string;
  stationId: string;
}

/**
 * Mark a station as no longer serving.
 *
 * The queue only goes `unavailable` once every station has stopped — one
 * till closing for a break must not turn away customers a second, still-open
 * till could serve. See `startServing` for why this is explicit rather than
 * tied to the tab or connection.
 */
export async function performStopServing(
  firestore: Firestore,
  callerUid: string,
  input: StopServingRequest,
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
  const stationsRef = queueRef.collection('stations');
  const stationRef = stationsRef.doc(stationId);

  await firestore.runTransaction(async (tx: Transaction) => {
    const [queueSnap, stationsSnap] = await Promise.all([
      tx.get(queueRef),
      tx.get(stationsRef),
    ]);

    const queue = queueSnap.data() as Queue | undefined;
    if (!queue) throw fail('not-found', 'queue-not-found', 'Queue not found.');

    const stationDoc = stationsSnap.docs.find((d) => d.id === stationId);
    if (!stationDoc) {
      throw fail('not-found', 'station-not-found', 'Station not found.');
    }

    tx.update(stationRef, { serving: false });

    const stillServing = stationsSnap.docs.some(
      (d) => d.id !== stationId && (d.data() as Station).serving,
    );
    const next = nextStatusForServing(queue.status, stillServing);
    if (next) tx.update(queueRef, { status: next });
  });
}

export const stopServing = onCall<StopServingRequest, Promise<void>>(
  (request: CallableRequest<StopServingRequest>) =>
    performStopServing(db, requireCaller(request).uid, request.data),
);
