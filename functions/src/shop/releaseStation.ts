import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { requireServeAccess } from '../lib/access.js';
import type { Station } from '../../../src/types/index.js';

export interface ReleaseStationRequest {
  shopId: string;
  queueId: string;
  stationId: string;
  deviceId: string;
}

/**
 * Let go of a till this device was holding ("Skift kasse"), so it can be
 * deleted or taken by someone else without a "delete anyway?".
 *
 * Only this device's own hold is cleared: if another device has claimed the
 * till since, that hold is theirs and stays. A till already gone is fine —
 * there is nothing left to let go of.
 */
export async function performReleaseStation(
  firestore: Firestore,
  callerUid: string,
  input: ReleaseStationRequest,
): Promise<void> {
  const { shopId, queueId, stationId, deviceId } = input;
  if (!shopId || !queueId || !stationId || !deviceId) {
    throw fail(
      'invalid-argument',
      'station-not-found',
      'shopId, queueId, stationId and deviceId are required.',
    );
  }

  await requireServeAccess(firestore, shopId, callerUid);

  const ref = firestore.doc(`shops/${shopId}/queues/${queueId}/stations/${stationId}`);
  await firestore.runTransaction(async (tx: Transaction) => {
    const station = (await tx.get(ref)).data() as Station | undefined;
    if (station?.activeDeviceId === deviceId) {
      tx.update(ref, { activeDeviceId: null });
    }
  });
}

export const releaseStation = onCall<ReleaseStationRequest, Promise<void>>(
  (request: CallableRequest<ReleaseStationRequest>) =>
    performReleaseStation(db, requireCaller(request).uid, request.data),
);
