import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { isDemo } from '../demo/mode.js';
import { demoRef } from '../hooks/useFirestore.js';
import {
  customerConverter,
  queueConverter,
  shopConverter,
  staffConverter,
  stationConverter,
  ticketConverter,
} from './converters.js';
import type {
  Customer,
  Queue,
  Shop,
  StaffMember,
  Station,
  Ticket,
} from '../../types/index.js';

/**
 * Every collection path in one place, typed and converter-bound. Components and
 * hooks go through these — no raw `collection(db, '...')` calls elsewhere.
 * Layout follows PRD 9.2.
 */


/**
 * In demo mode these return a path descriptor rather than a Firestore
 * reference. Both are accepted by `useDoc`/`useCollection`, so no component
 * has to know which build it is running in — the cast is the price of keeping
 * every call site identical, and it is confined to this file.
 */
function ref<T>(path: string, real: () => T): T {
  return isDemo ? (demoRef(path) as unknown as T) : real();
}

export const shops = (): CollectionReference<Shop> =>
  ref('shops', () => collection(db, 'shops').withConverter(shopConverter));

export const shopDoc = (shopId: string): DocumentReference<Shop> =>
  ref(`shops/${shopId}`, () =>
    doc(db, 'shops', shopId).withConverter(shopConverter),
  );

export const staff = (shopId: string): CollectionReference<StaffMember> =>
  ref(`shops/${shopId}/staff`, () =>
    collection(db, 'shops', shopId, 'staff').withConverter(staffConverter),
  );

export const queues = (shopId: string): CollectionReference<Queue> =>
  ref(`shops/${shopId}/queues`, () =>
    collection(db, 'shops', shopId, 'queues').withConverter(queueConverter),
  );

export const queueDoc = (
  shopId: string,
  queueId: string,
): DocumentReference<Queue> =>
  ref(`shops/${shopId}/queues/${queueId}`, () =>
    doc(db, 'shops', shopId, 'queues', queueId).withConverter(queueConverter),
  );

export const tickets = (
  shopId: string,
  queueId: string,
): CollectionReference<Ticket> =>
  ref(`shops/${shopId}/queues/${queueId}/tickets`, () =>
    collection(db, 'shops', shopId, 'queues', queueId, 'tickets').withConverter(
      ticketConverter,
    ),
  );

export const ticketDoc = (
  shopId: string,
  queueId: string,
  ticketId: string,
): DocumentReference<Ticket> =>
  ref(`shops/${shopId}/queues/${queueId}/tickets/${ticketId}`, () =>
    doc(
      db,
      'shops',
      shopId,
      'queues',
      queueId,
      'tickets',
      ticketId,
    ).withConverter(ticketConverter),
  );

export const stations = (
  shopId: string,
  queueId: string,
): CollectionReference<Station> =>
  ref(`shops/${shopId}/queues/${queueId}/stations`, () =>
    collection(db, 'shops', shopId, 'queues', queueId, 'stations').withConverter(
      stationConverter,
    ),
  );

export const stationDoc = (
  shopId: string,
  queueId: string,
  stationId: string,
): DocumentReference<Station> =>
  doc(
    db,
    'shops',
    shopId,
    'queues',
    queueId,
    'stations',
    stationId,
  ).withConverter(stationConverter);

export const customerDoc = (uid: string): DocumentReference<Customer> =>
  doc(db, 'customers', uid).withConverter(customerConverter);
