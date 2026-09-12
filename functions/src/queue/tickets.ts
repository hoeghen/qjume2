import { createHash } from 'node:crypto';
import type {
  DocumentReference,
  Firestore,
} from 'firebase-admin/firestore';
import { TICKET_CONTACT_DOC } from '../../../src/types/index.js';

/**
 * Opaque stand-in for whoever holds a ticket, used to stop one person joining
 * the same queue twice.
 *
 * Salted with the queue id so the same person in two queues produces two
 * unrelated values: the public ticket is readable by anyone (the in-shop
 * monitor needs it), and a raw uid there would let a bystander link a
 * stranger's visits across shops.
 */
export function holderKeyFor(queueId: string, uid: string): string {
  return createHash('sha256').update(`${queueId}:${uid}`).digest('hex');
}

export function contactRef(
  firestore: Firestore,
  shopId: string,
  queueId: string,
  ticketId: string,
): DocumentReference {
  return firestore.doc(
    `shops/${shopId}/queues/${queueId}/tickets/${ticketId}/private/${TICKET_CONTACT_DOC}`,
  );
}
