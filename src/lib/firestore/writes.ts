import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { shopConverter } from './converters.js';
import { isDemo } from '../demo/mode.js';
import { demoStore } from '../demo/store.js';
import type { QueueStatus, Shop } from '../../types/index.js';

/**
 * The two writes a client is allowed to make directly.
 *
 * Everything else about a queue goes through a Cloud Function, because it
 * needs a query, a secret, or trust the client does not have. These two do
 * not: pausing is a single field the rules can check, and creating a shop is
 * the one document an owner brings into existence themselves.
 */

/** Pause, resume or open. The only queue field a client may write. */
export async function setQueueStatus(
  shopId: string,
  queueId: string,
  status: QueueStatus,
): Promise<void> {
  if (isDemo) {
    demoStore.update(`shops/${shopId}/queues/${queueId}`, { status });
    return;
  }
  await updateDoc(
    doc(db, 'shops', shopId, 'queues', queueId),
    { status },
  );
}

export async function createShop(ownerUid: string, shop: Shop): Promise<void> {
  if (isDemo) {
    demoStore.set(`shops/${ownerUid}`, shop as unknown as Record<string, unknown>);
    return;
  }
  await setDoc(doc(db, 'shops', ownerUid).withConverter(shopConverter), shop);
}
