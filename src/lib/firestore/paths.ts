import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../firebase.js';
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

export const shops = (): CollectionReference<Shop> =>
  collection(db, 'shops').withConverter(shopConverter);

export const shopDoc = (shopId: string): DocumentReference<Shop> =>
  doc(db, 'shops', shopId).withConverter(shopConverter);

export const staff = (shopId: string): CollectionReference<StaffMember> =>
  collection(db, 'shops', shopId, 'staff').withConverter(staffConverter);

export const queues = (shopId: string): CollectionReference<Queue> =>
  collection(db, 'shops', shopId, 'queues').withConverter(queueConverter);

export const queueDoc = (
  shopId: string,
  queueId: string,
): DocumentReference<Queue> =>
  doc(db, 'shops', shopId, 'queues', queueId).withConverter(queueConverter);

export const tickets = (
  shopId: string,
  queueId: string,
): CollectionReference<Ticket> =>
  collection(db, 'shops', shopId, 'queues', queueId, 'tickets').withConverter(
    ticketConverter,
  );

export const ticketDoc = (
  shopId: string,
  queueId: string,
  ticketId: string,
): DocumentReference<Ticket> =>
  doc(
    db,
    'shops',
    shopId,
    'queues',
    queueId,
    'tickets',
    ticketId,
  ).withConverter(ticketConverter);

export const stations = (
  shopId: string,
  queueId: string,
): CollectionReference<Station> =>
  collection(db, 'shops', shopId, 'queues', queueId, 'stations').withConverter(
    stationConverter,
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
