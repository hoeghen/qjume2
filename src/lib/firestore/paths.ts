import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import {
  auditEntryConverter,
  customerConverter,
  queueConverter,
  shopConverter,
  shopOwnerConverter,
  staffConverter,
  staffMembershipConverter,
  stationConverter,
  ticketContactConverter,
  ticketConverter,
} from './converters.js';
import type {
  AdminAuditEntry,
  Customer,
  Queue,
  Shop,
  ShopOwner,
  StaffMember,
  StaffMembership,
  Station,
  Ticket,
  TicketContact,
} from '../../types/index.js';
import { TICKET_CONTACT_DOC } from '../../types/index.js';

/**
 * Every collection path in one place, typed and converter-bound. Components and
 * hooks go through these — no raw `collection(db, '...')` calls elsewhere.
 * Layout follows PRD 9.2.
 */


export const shops = (): CollectionReference<Shop> =>
  collection(db, 'shops').withConverter(shopConverter);

export const shopDoc = (shopId: string): DocumentReference<Shop> =>
  doc(db, 'shops', shopId).withConverter(shopConverter);

/** Owner emails, admin-readable only. See `ShopOwner`. */
export const shopOwners = (): CollectionReference<ShopOwner> =>
  collection(db, 'shopOwners').withConverter(shopOwnerConverter);

export const shopOwnerDoc = (shopId: string): DocumentReference<ShopOwner> =>
  doc(db, 'shopOwners', shopId).withConverter(shopOwnerConverter);

export const staff = (shopId: string): CollectionReference<StaffMember> =>
  collection(db, 'shops', shopId, 'staff').withConverter(staffConverter);

export const staffDoc = (
  shopId: string,
  uid: string,
): DocumentReference<StaffMember> =>
  doc(db, 'shops', shopId, 'staff', uid).withConverter(staffConverter);

/** Reverse index: which shop, if any, this uid is staff at. */
export const staffMembershipDoc = (
  uid: string,
): DocumentReference<StaffMembership> =>
  doc(db, 'staffMemberships', uid).withConverter(staffMembershipConverter);

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

/**
 * A ticket's private half — contact details and the resume code. Readable
 * only by the shop serving it and the ticket's holder; see `firestore.rules`.
 */
export const ticketContactDoc = (
  shopId: string,
  queueId: string,
  ticketId: string,
): DocumentReference<TicketContact> =>
  doc(
    db,
    'shops',
    shopId,
    'queues',
    queueId,
    'tickets',
    ticketId,
    'private',
    TICKET_CONTACT_DOC,
  ).withConverter(ticketContactConverter);

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

/** Platform admin only — see `firestore.rules`. */
export const auditLog = (): CollectionReference<AdminAuditEntry> =>
  collection(db, 'adminAuditLog').withConverter(auditEntryConverter);
