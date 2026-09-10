import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { Queue, Shop, Station } from '../../../src/types/index.js';

export const PROJECT_ID = 'qjume-local';
export const OWNER_UID = 'owner-uid';

if (getApps().length === 0) initializeApp({ projectId: PROJECT_ID });

export const testDb: Firestore = getFirestore();

/** Wipe the emulator between tests via its own admin endpoint. */
export async function clearFirestore(): Promise<void> {
  const host = process.env['FIRESTORE_EMULATOR_HOST'];
  const res = await fetch(
    `http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`clearFirestore failed: ${res.status}`);
}

export function makeShop(overrides: Partial<Shop> = {}): Shop {
  return {
    name: 'Test Shop',
    ownerUid: OWNER_UID,
    plan: 'paid',
    exclusiveQueues: false,
    ...overrides,
  };
}

export function makeQueue(overrides: Partial<Queue> = {}): Queue {
  return {
    name: 'Test Queue',
    shopName: 'Test Shop',
    description: null,
    category: 'other',
    maxSize: 1000,
    address: '1 Test Street',
    lat: null,
    lng: null,
    geohash: null,
    avgServiceTimeSeconds: 300,
    noShowPenalty: 'back',
    status: 'open',
    schedule: null,
    currentNumber: 0,
    lastIssuedNumber: 0,
    lastPosition: 0,
    lastServedAt: null,
    waitingCount: 0,
    ...overrides,
  };
}

export function makeStation(overrides: Partial<Station> = {}): Station {
  return {
    label: 'Till 1',
    activeStaffUid: OWNER_UID,
    currentTicketId: null,
    ...overrides,
  };
}

export interface Fixture {
  shopId: string;
  queueId: string;
}

export async function seedQueue(
  shop: Partial<Shop> = {},
  queue: Partial<Queue> = {},
): Promise<Fixture> {
  const shopRef = testDb.collection('shops').doc();
  await shopRef.set(makeShop(shop));
  const queueRef = shopRef.collection('queues').doc();
  await queueRef.set(makeQueue(queue));
  return { shopId: shopRef.id, queueId: queueRef.id };
}

export async function seedStation(
  fx: Fixture,
  label: string,
): Promise<string> {
  const ref = testDb
    .doc(`shops/${fx.shopId}/queues/${fx.queueId}`)
    .collection('stations')
    .doc();
  await ref.set(makeStation({ label }));
  return ref.id;
}

/** Display names of the waiting tickets, in serving order. */
export async function waitingOrder(fx: Fixture): Promise<string[]> {
  const snap = await testDb
    .doc(`shops/${fx.shopId}/queues/${fx.queueId}`)
    .collection('tickets')
    .where('state', '==', 'waiting')
    .orderBy('position')
    .get();
  return snap.docs.map((d) => d.data()['displayName'] as string);
}

export async function getQueue(fx: Fixture): Promise<Queue> {
  const snap = await testDb
    .doc(`shops/${fx.shopId}/queues/${fx.queueId}`)
    .get();
  return snap.data() as Queue;
}
