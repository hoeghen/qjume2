import {
  endBefore,
  limit,
  orderBy,
  query,
  where,
  type Query,
} from 'firebase/firestore';
import { shops, staff, stations, tickets } from './paths.js';
import { isMock } from '../mock/mode.js';
import { mockQuery } from '../hooks/useFirestore.js';
import type { Queue, Shop, Ticket } from '../../types/index.js';
import { queues } from './paths.js';

/** The signed-in owner's shop. */
export function shopsOwnedBy(uid: string): Query<Shop> {
  if (isMock) {
    return mockQuery('shops', {
      where: (row) => row['ownerUid'] === uid,
      max: 1,
    }) as unknown as Query<Shop>;
  }
  return query(shops(), where('ownerUid', '==', uid), limit(1));
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
  if (isMock) {
    return mockQuery(`shops/${shopId}/queues/${queueId}/tickets`, {
      where: (row) => row['state'] === 'waiting',
      sortBy: 'position',
      max,
    }) as unknown as Query<Ticket>;
  }
  return query(
    tickets(shopId, queueId),
    where('state', '==', 'waiting'),
    orderBy('position'),
    limit(max),
  );
}

/** Tickets currently at a station, across all stations. */
export function servingTickets(shopId: string, queueId: string): Query<Ticket> {
  if (isMock) {
    return mockQuery(`shops/${shopId}/queues/${queueId}/tickets`, {
      where: (row) => row['state'] === 'serving',
    }) as unknown as Query<Ticket>;
  }
  return query(tickets(shopId, queueId), where('state', '==', 'serving'));
}

/** Every ticket currently ahead of, or level with, a given position. */
export function ticketsAhead(
  shopId: string,
  queueId: string,
  position: number,
): Query<Ticket> {
  if (isMock) {
    return mockQuery(`shops/${shopId}/queues/${queueId}/tickets`, {
      where: (row) =>
        row['state'] === 'waiting' && Number(row['position']) < position,
      sortBy: 'position',
    }) as unknown as Query<Ticket>;
  }
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
