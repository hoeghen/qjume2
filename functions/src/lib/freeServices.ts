import type { Firestore } from 'firebase-admin/firestore';
import { takesNewCustomers } from '../../../src/lib/freeServices.js';
import type { Queue, Shop } from '../../../src/types/index.js';

/**
 * Bring every queue's `shopOutOfFreeServices` copy in line with the shop.
 *
 * Called after anything that can move the answer — the service that used the
 * last free one, an admin grant, a plan change. Writes only the queues whose
 * copy is wrong, so the common call is a read and nothing else. Not in the
 * caller's transaction on purpose: the copy is for discovery only, and
 * `joinQueue` checks the live shop, so a late or failed sync can only show a
 * queue a beat too long, never let a join through.
 */
export async function syncFreeServicesFlag(
  firestore: Firestore,
  shopId: string,
): Promise<void> {
  const shopRef = firestore.doc(`shops/${shopId}`);
  const shop = (await shopRef.get()).data() as Shop | undefined;
  if (!shop) return;
  const outOf = !takesNewCustomers(shop);

  const queues = await shopRef.collection('queues').get();
  const stale = queues.docs.filter(
    (d) => ((d.data() as Queue).shopOutOfFreeServices ?? false) !== outOf,
  );
  if (stale.length === 0) return;

  const batch = firestore.batch();
  for (const d of stale) batch.update(d.ref, { shopOutOfFreeServices: outOf });
  await batch.commit();
}
