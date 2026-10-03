import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { requireOwnerAccess } from '../lib/access.js';
import type { StaffMember, StaffMembership } from '../../../src/types/index.js';

export interface AddStaffRequest {
  shopId: string;
  email: string;
  /** What the owner calls them, for the staff list. */
  name?: string;
}

const STAFF_NAME_MAX = 40;

/**
 * The account for this email, made if there is none yet.
 *
 * It used to have to exist already ("ask them to sign in once first"), which
 * made adding someone a two-visit errand. Creating it here costs nothing: the
 * email sign-in link they then use signs them into this same account, since
 * Firebase matches it by email.
 */
async function accountFor(email: string, name: string | null): Promise<string | null> {
  const auth = getAuth();
  try {
    return (await auth.getUserByEmail(email)).uid;
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/user-not-found') return null;
  }
  const created = await auth.createUser({
    email,
    ...(name ? { displayName: name } : {}),
  });
  return created.uid;
}

export interface RemoveStaffRequest {
  shopId: string;
  uid: string;
}

/**
 * Add someone who can serve but not change anything. Available on every
 * plan: the free plan is the whole app, limited by a count of services.
 */
export async function performAddStaff(
  firestore: Firestore,
  callerUid: string,
  input: AddStaffRequest,
  /** Overridden by tests, which have no Auth emulator behind them. */
  lookupUid: (email: string, name: string | null) => Promise<string | null> = accountFor,
): Promise<{ uid: string }> {
  const { shopId } = input;
  const email = input.email?.trim().toLowerCase();
  const name = input.name?.trim().slice(0, STAFF_NAME_MAX) || null;
  if (!shopId || !email) {
    throw fail('invalid-argument', 'shop-not-found', 'shopId and email are required.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw fail('invalid-argument', 'not-shop-staff', 'That is not an email address.');
  }

  const shop = await requireOwnerAccess(firestore, shopId, callerUid);

  const uid = await lookupUid(email, name);
  if (!uid) {
    throw fail('not-found', 'not-shop-staff', 'Could not find or create an account for that email.');
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
    name,
    addedAt: Date.now(),
    addedBy: callerUid,
  };
  // Two writes: the per-shop record shopAccessFor checks, and a top-level
  // reverse index (staffMemberships/{uid}) so the staff member's own client
  // can find which shop that is at all — see StaffMembership's own comment
  // for why a collection-group lookup can't do this. One membership per
  // person, the same simplification shopsOwnedBy already makes for owners:
  // being added somewhere new overwrites which shop they'll land on.
  await firestore.runTransaction(async (tx) => {
    tx.set(firestore.doc(`shops/${shopId}/staff/${uid}`), member);
    const membership: StaffMembership = { shopId };
    tx.set(firestore.doc(`staffMemberships/${uid}`), membership);
  });
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

  const membershipRef = firestore.doc(`staffMemberships/${uid}`);
  await firestore.runTransaction(async (tx) => {
    // Reads before writes, as every Firestore transaction requires.
    const membershipSnap = await tx.get(membershipRef);
    const membership = membershipSnap.data() as StaffMembership | undefined;

    tx.delete(firestore.doc(`shops/${shopId}/staff/${uid}`));
    // Only clear the reverse index if it still points here — it may already
    // point at a shop they were added to more recently.
    if (membership?.shopId === shopId) tx.delete(membershipRef);
  });
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
