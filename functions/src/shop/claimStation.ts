import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { requireServeAccess } from '../lib/access.js';
import {
  type Shop,
  type Station,
} from '../../../src/types/index.js';
import { nextTillNumber } from '../../../src/lib/tills.js';

export interface ClaimStationRequest {
  shopId: string;
  queueId: string;
  /** Claim an existing station, or omit to open a new one. */
  stationId?: string;
  label?: string;
  /** This device's id (`src/lib/device.ts`): the till is held by it. */
  deviceId?: string;
}

export interface ClaimStationResult {
  stationId: string;
  label: string;
}

/**
 * Claim a serving position at the start of a shift.
 *
 * Server-side because the free tier allows one server at a time: a second
 * device cannot open a parallel station by writing the document itself.
 */
export async function performClaimStation(
  firestore: Firestore,
  callerUid: string,
  input: ClaimStationRequest,
): Promise<ClaimStationResult> {
  const { shopId, queueId, stationId } = input;
  if (!shopId || !queueId) {
    throw fail(
      'invalid-argument',
      'station-not-found',
      'shopId and queueId are required.',
    );
  }

  const shopRef = firestore.doc(`shops/${shopId}`);
  const stationsRef = firestore
    .doc(`shops/${shopId}/queues/${queueId}`)
    .collection('stations');

  await requireServeAccess(firestore, shopId, callerUid);

  return firestore.runTransaction(async (tx: Transaction) => {
    const shopSnap = await tx.get(shopRef);
    const shop = shopSnap.data() as Shop | undefined;
    if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');

    const existing = await tx.get(stationsRef);
    const deviceId = input.deviceId || null;

    // One device stands at one till per queue: taking a till lets go of any
    // other this device was holding here, so a switch never leaves a stale
    // hold that would block deleting the till it left.
    const letGoOfOthers = (keep: string) => {
      if (!deviceId) return;
      for (const doc of existing.docs) {
        if (doc.id !== keep && (doc.data() as Station).activeDeviceId === deviceId) {
          tx.update(doc.ref, { activeDeviceId: null });
        }
      }
    };

    if (stationId) {
      const snap = existing.docs.find((d) => d.id === stationId);
      const station = snap?.data() as Station | undefined;
      if (!snap || !station) {
        throw fail('not-found', 'station-not-found', 'Station not found.');
      }
      letGoOfOthers(stationId);
      tx.update(snap.ref, { activeStaffUid: callerUid, activeDeviceId: deviceId });
      return { stationId, label: station.label };
    }

    // Stored in English and worded per reader by `tillLabel`.
    const label =
      input.label?.trim() ||
      `Till ${nextTillNumber(existing.docs.map((d) => (d.data() as Station).label))}`;
    const ref = stationsRef.doc();
    const station: Station = {
      label,
      activeStaffUid: callerUid,
      currentTicketId: null,
      serving: false,
      activeDeviceId: deviceId,
    };
    letGoOfOthers(ref.id);
    tx.set(ref, station);
    return { stationId: ref.id, label };
  });
}

export const claimStation = onCall<
  ClaimStationRequest,
  Promise<ClaimStationResult>
>((request: CallableRequest<ClaimStationRequest>) =>
  performClaimStation(db, requireCaller(request).uid, request.data),
);
