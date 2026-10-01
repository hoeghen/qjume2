import {
  endBefore,
  limit,
  orderBy,
  query,
  where,
  type Query,
} from 'firebase/firestore';
import { auditLog, shops, staff, stations, tickets } from './paths.js';
import type { AdminAuditEntry, Queue, Shop, Ticket } from '../../types/index.js';
import { queues } from './paths.js';

/** The signed-in owner's shop. */
export function shopsOwnedBy(uid: string): Query<Shop> {
  return query(shops(), where('ownerUid', '==', uid), limit(1));
}

/** Platform admin's browse list. Every shop, alphabetical. */
export function allShops(): Query<Shop> {
  return query(shops(), orderBy('name'));
}

/** Platform admin's audit trail, most recent first. */
export function auditLogEntries(max = 200): Query<AdminAuditEntry> {
  return query(auditLog(), orderBy('at', 'desc'), limit(max));
}

export function queuesOf(shopId: string): Query<Queue> {
  return queues(shopId);
}

export function stationsOf(shopId: string, queueId: string) {
  return stations(shopId, queueId);
}

/** Waiting tickets in serving order. */
export function waitingTickets(
  shopId: string,
  queueId: string,
  max = 50,
): Query<Ticket> {
  return query(
    tickets(shopId, queueId),
    where('state', '==', 'waiting'),
    orderBy('position'),
    limit(max),
  );
}

/** Tickets currently at a station, across all stations. */
export function servingTickets(shopId: string, queueId: string): Query<Ticket> {
  return query(tickets(shopId, queueId), where('state', '==', 'serving'));
}

/** Every ticket currently ahead of, or level with, a given position. */
export function ticketsAhead(
  shopId: string,
  queueId: string,
  position: number,
): Query<Ticket> {
  return query(
    tickets(shopId, queueId),
    where('state', '==', 'waiting'),
    orderBy('position'),
    endBefore(position),
  );
}

export function staffOf(shopId: string) {
  return staff(shopId);
}
