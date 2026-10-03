import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { requireServeAccess } from '../lib/access.js';
import type { Station } from '../../../src/types/index.js';

export interface DeleteStationRequest {
  shopId: string;
  queueId: string;
  stationId: string;
  /** The deleting device; a till it holds itself is not "held elsewhere". */
  deviceId?: string;
  /** Delete even though another device has the till open. */
  force?: boolean;
}

/**
 * Remove a till nobody is using.
 *
 * Tills were never deleted, so one opened once for a busy Saturday stayed on
 * the picker and the monitor ("Lukket") for good. Only a till that is not
 * serving and has nobody at it can go: a customer belongs to the till
 * (`currentTicketId`), and deleting it under them would leave them "being
 * served" somewhere that no longer exists. Inside a transaction, so a "Start
 * serving" or a "Next" landing at the same moment wins rather than racing.
 *
 * A till another device has open (`activeDeviceId`) is refused unless the
 * caller says `force`: that device would otherwise be left pointing at a till
 * that no longer exists. The UI asks "delete anyway?" rather than making it
 * impossible, because a device that was simply closed keeps its hold, and a
 * till must never become undeletable. The other device drops back to its
 * till picker when its till vanishes (ServingScreen.tsx).
 *
 * Open to staff as well as the owner — the same people who open tills.
 */
export async function performDeleteStation(
  firestore: Firestore,
  callerUid: string,
  input: DeleteStationRequest,
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

  const ref = firestore.doc(`shops/${shopId}/queues/${queueId}/stations/${stationId}`);
  await firestore.runTransaction(async (tx: Transaction) => {
    const station = (await tx.get(ref)).data() as Station | undefined;
    if (!station) throw fail('not-found', 'station-not-found', 'Till not found.');
    if (station.serving || station.currentTicketId) {
      throw fail(
        'failed-precondition',
        'station-in-use',
        'This till is in use. Finish its customer and stop serving first.',
      );
    }
    const holder = station.activeDeviceId ?? null;
    if (holder && holder !== (input.deviceId || null) && !input.force) {
      throw fail(
        'failed-precondition',
        'station-held',
        'This till is open on another device.',
      );
    }
    tx.delete(ref);
  });
}

export const deleteStation = onCall<DeleteStationRequest, Promise<void>>(
  (request: CallableRequest<DeleteStationRequest>) =>
    performDeleteStation(db, requireCaller(request).uid, request.data),
);
