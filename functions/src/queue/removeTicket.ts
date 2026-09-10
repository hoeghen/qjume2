import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import {
  FieldValue,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import type { Shop, Ticket } from '../../../src/types/index.js';

export interface RemoveTicketRequest {
  shopId: string;
  queueId: string;
  ticketId: string;
}

/**
 * The shop ejecting a customer from the queue outright (PRD 5.4). Distinct from
 * `leaveQueue`, which is the customer's own choice.
 */
export async function performRemoveTicket(
  firestore: Firestore,
  callerUid: string,
  input: RemoveTicketRequest,
): Promise<{ ok: true }> {
  {
    const { shopId, queueId, ticketId } = input;

    if (!shopId || !queueId || !ticketId) {
      throw fail(
        'invalid-argument',
        'ticket-not-found',
        'shopId, queueId and ticketId are required.',
      );
    }

    const shopRef = firestore.doc(`shops/${shopId}`);
    const queueRef = firestore.doc(`shops/${shopId}/queues/${queueId}`);
    const ticketRef = queueRef.collection('tickets').doc(ticketId);

    await firestore.runTransaction(async (tx: Transaction) => {
      const [shopSnap, snap] = await Promise.all([
        tx.get(shopRef),
        tx.get(ticketRef),
      ]);

      const shop = shopSnap.data() as Shop | undefined;
      if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');
      if (shop.ownerUid !== callerUid) {
        throw fail(
          'permission-denied',
          'not-shop-owner',
          'Only the shop owner can remove a customer.',
        );
      }

      const ticket = snap.data() as Ticket | undefined;
      if (!ticket) {
        throw fail('not-found', 'ticket-not-found', 'Ticket not found.');
      }
      if (ticket.state !== 'waiting' && ticket.state !== 'serving') {
        throw fail(
          'failed-precondition',
          'ticket-not-waiting',
          'This ticket is no longer active.',
        );
      }

      tx.update(ticketRef, { state: 'removed', station: null });

      if (ticket.state === 'waiting') {
        tx.update(queueRef, { waitingCount: FieldValue.increment(-1) });
      }
      if (ticket.state === 'serving' && ticket.station) {
        tx.update(queueRef.collection('stations').doc(ticket.station), {
          currentTicketId: null,
        });
      }
    });

    return { ok: true } as const;
  }
}

export const removeTicket = onCall<RemoveTicketRequest, Promise<{ ok: true }>>(
  (request: CallableRequest<RemoveTicketRequest>) =>
    performRemoveTicket(db, requireCaller(request).uid, request.data),
);
