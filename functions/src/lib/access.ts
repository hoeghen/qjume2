import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { fail } from './errors.js';
import type { Shop, ShopAccess } from '../../../src/types/index.js';

export interface ShopContext {
  shop: Shop;
  access: ShopAccess;
}

/**
 * What this caller may do with this shop.
 *
 * Staff are a paid feature, so a staff record on a free shop grants nothing —
 * otherwise downgrading to free would leave staff quietly still able to serve,
 * which is the free tier being enforced in the UI only.
 */
export async function shopAccessFor(
  firestore: Firestore,
  shopId: string,
  callerUid: string,
): Promise<ShopContext> {
  const snap = await firestore.doc(`shops/${shopId}`).get();
  const shop = snap.data() as Shop | undefined;
  if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');

  if (shop.ownerUid === callerUid) return { shop, access: 'owner' };

  if (shop.plan === 'paid') {
    const member = await firestore
      .doc(`shops/${shopId}/staff/${callerUid}`)
      .get();
    if (member.exists) return { shop, access: 'staff' };
  }

  return { shop, access: 'none' };
}

/** Anyone who may work the counter: the owner, or staff on a paid shop. */
export async function requireServeAccess(
  firestore: Firestore,
  shopId: string,
  callerUid: string,
): Promise<Shop> {
  const { shop, access } = await shopAccessFor(firestore, shopId, callerUid);
  if (access === 'none') {
    throw fail(
      'permission-denied',
      'not-shop-staff',
      'You are not serving this shop.',
    );
  }
  return shop;
}

/** Settings and billing, which are the owner's alone. */
export async function requireOwnerAccess(
  firestore: Firestore,
  shopId: string,
  callerUid: string,
): Promise<Shop> {
  const { shop, access } = await shopAccessFor(firestore, shopId, callerUid);
  if (access !== 'owner') {
    throw fail(
      'permission-denied',
      'not-shop-owner',
      'Only the shop owner can do that.',
    );
  }
  return shop;
}

/**
 * The same rule as `requireServeAccess`, for a caller that has already read
 * the shop inside a transaction.
 *
 * Serving is the hottest path in the product, and reading the shop a second
 * time to answer a question the transaction can already answer costs a
 * round-trip on every tap. The staff lookup happens only when the caller is
 * not the owner, which is the uncommon case.
 */
export async function assertServeAccessInTransaction(
  tx: Transaction,
  firestore: Firestore,
  shopId: string,
  shop: Shop,
  callerUid: string,
): Promise<void> {
  if (shop.ownerUid === callerUid) return;

  if (shop.plan === 'paid') {
    const member = await tx.get(
      firestore.doc(`shops/${shopId}/staff/${callerUid}`),
    );
    if (member.exists) return;
  }

  throw fail(
    'permission-denied',
    'not-shop-staff',
    'You are not serving this shop.',
  );
}
