import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { requireOwnerAccess } from '../lib/access.js';
import type { StaffMember } from '../../../src/types/index.js';

export interface AddStaffRequest {
  shopId: string;
  email: string;
}

export interface RemoveStaffRequest {
  shopId: string;
  uid: string;
}

/**
 * Add someone who can serve but not change anything.
 *
 * A paid feature, enforced here rather than by hiding the form: a free shop
 * that could add staff would have got a paid feature for nothing.
 */
export async function performAddStaff(
  firestore: Firestore,
  callerUid: string,
  input: AddStaffRequest,
  lookupUid: (email: string) => Promise<string | null> = async (email) => {
    try {
      return (await getAuth().getUserByEmail(email)).uid;
    } catch {
      return null;
    }
  },
): Promise<{ uid: string }> {
  const { shopId } = input;
  const email = input.email?.trim().toLowerCase();
  if (!shopId || !email) {
    throw fail('invalid-argument', 'shop-not-found', 'shopId and email are required.');
  }

  const shop = await requireOwnerAccess(firestore, shopId, callerUid);
  if (shop.plan !== 'paid') {
    throw fail(
      'failed-precondition',
      'free-tier-staff-limit',
      'Staff members are part of the paid plan.',
    );
  }

  const uid = await lookupUid(email);
  if (!uid) {
    // They must have signed in once before they can be given access; there is
    // no account to attach the permission to otherwise.
    throw fail(
      'not-found',
      'not-shop-staff',
      'No Qjume account with that email. Ask them to sign in once first.',
    );
  }
  if (uid === shop.ownerUid) {
    throw fail(
      'failed-precondition',
      'not-shop-staff',
      'You already own this shop.',
    );
  }

  const member: StaffMember = {
    email,
    addedAt: Date.now(),
    addedBy: callerUid,
  };
  await firestore.doc(`shops/${shopId}/staff/${uid}`).set(member);
  return { uid };
}

export async function performRemoveStaff(
  firestore: Firestore,
  callerUid: string,
  input: RemoveStaffRequest,
): Promise<{ ok: true }> {
  const { shopId, uid } = input;
  if (!shopId || !uid) {
    throw fail('invalid-argument', 'shop-not-found', 'shopId and uid are required.');
  }

  await requireOwnerAccess(firestore, shopId, callerUid);
  await firestore.doc(`shops/${shopId}/staff/${uid}`).delete();
  return { ok: true } as const;
}

export const addStaff = onCall<AddStaffRequest, Promise<{ uid: string }>>(
  (request: CallableRequest<AddStaffRequest>) =>
    performAddStaff(db, requireCaller(request).uid, request.data),
);

export const removeStaff = onCall<RemoveStaffRequest, Promise<{ ok: true }>>(
  (request: CallableRequest<RemoveStaffRequest>) =>
    performRemoveStaff(db, requireCaller(request).uid, request.data),
);
