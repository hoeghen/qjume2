import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requirePlatformAdmin, type AdminCaller } from '../lib/auth.js';
import { syncFreeServicesFlag } from '../lib/freeServices.js';
import { logAdminAction } from './auditLog.js';
import { freeServicesGranted } from '../../../src/lib/freeServices.js';
import type { Shop } from '../../../src/types/index.js';

export interface GrantFreeServicesRequest {
  shopId: string;
  /** Extra free services to add on top of what the shop already has. */
  amount: number;
}

export interface GrantFreeServicesResult {
  freeServicesGranted: number;
}

/** A sanity bound, not a policy: big enough for any real grant, small enough to catch a typo. */
const MAX_GRANT = 100_000;

/**
 * Give one shop extra free services — a platform admin's goodwill, not a
 * payment, so it never touches `plan`. Logged in the same transaction as the
 * change, like every admin action. A shop that had run out takes new
 * customers again straight away, and its queues come back into discovery.
 */
export async function performGrantFreeServices(
  firestore: Firestore,
  admin: AdminCaller,
  input: GrantFreeServicesRequest,
): Promise<GrantFreeServicesResult> {
  const shopId = input.shopId?.trim();
  const amount = input.amount;
  if (!shopId) {
    throw fail('invalid-argument', 'shop-not-found', 'shopId is required.');
  }
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_GRANT) {
    throw fail(
      'invalid-argument',
      'shop-not-found',
      `amount must be a whole number from 1 to ${MAX_GRANT}.`,
    );
  }

  const shopRef = firestore.doc(`shops/${shopId}`);
  const granted = await firestore.runTransaction(async (tx: Transaction) => {
    const shop = (await tx.get(shopRef)).data() as Shop | undefined;
    if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');

    const before = freeServicesGranted(shop);
    const after = before + amount;
    tx.update(shopRef, { freeServicesGranted: after });

    await logAdminAction(firestore, tx, {
      action: 'shop.grantFreeServices',
      adminUid: admin.uid,
      adminEmail: admin.email,
      shopId,
      summary: `Gave ${shop.name} ${amount} extra free services`,
      changes: { freeServicesGranted: { before, after } },
    });
    return after;
  });

  await syncFreeServicesFlag(firestore, shopId);
  return { freeServicesGranted: granted };
}

export const adminGrantFreeServices = onCall<
  GrantFreeServicesRequest,
  Promise<GrantFreeServicesResult>
>((request: CallableRequest<GrantFreeServicesRequest>) =>
  performGrantFreeServices(db, requirePlatformAdmin(request), request.data),
);
