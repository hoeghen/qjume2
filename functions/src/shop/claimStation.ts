import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import {
  FREE_TIER_LIMITS,
  type Shop,
  type Station,
} from '../../../src/types/index.js';

export interface ClaimStationRequest {
  shopId: string;
  queueId: string;
  /** Claim an existing station, or omit to open a new one. */
  stationId?: string;
  label?: string;
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

  return firestore.runTransaction(async (tx: Transaction) => {
    const shopSnap = await tx.get(shopRef);
    const shop = shopSnap.data() as Shop | undefined;
    if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');
    if (shop.ownerUid !== callerUid) {
      throw fail(
        'permission-denied',
        'not-shop-owner',
        'Only the shop owner can serve this queue.',
      );
    }

    if (stationId) {
      const ref = stationsRef.doc(stationId);
      const snap = await tx.get(ref);
      const station = snap.data() as Station | undefined;
      if (!station) {
        throw fail('not-found', 'station-not-found', 'Station not found.');
      }
      tx.update(ref, { activeStaffUid: callerUid });
      return { stationId, label: station.label };
    }

    const existing = await tx.get(stationsRef);
    if (
      shop.plan === 'free' &&
      existing.size >= FREE_TIER_LIMITS.maxStations
    ) {
      throw fail(
        'resource-exhausted',
        'free-tier-station-limit',
        'The free plan serves one customer at a time.',
      );
    }

    const label = input.label?.trim() || `Till ${existing.size + 1}`;
    const ref = stationsRef.doc();
    const station: Station = {
      label,
      activeStaffUid: callerUid,
      currentTicketId: null,
    };
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
