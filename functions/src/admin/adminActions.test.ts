import { beforeEach, describe, expect, it } from 'vitest';
import { performJoinQueue } from '../queue/joinQueue.js';
import { performCallNext } from '../queue/callNext.js';
import { performCreateQueue } from '../shop/createQueue.js';
import {
  performReinstateShop,
  performSuspendShop,
} from './suspendShop.js';
import { performAdminUpdateShop } from './updateShop.js';
import { performAdminUpdateQueue } from './updateQueue.js';
import { performAdminDeleteShop } from './deleteShop.js';
import {
  OWNER_UID,
  clearFirestore,
  getQueue,
  makeQueue,
  seedQueue,
  seedStation,
  testDb,
  type Fixture,
} from '../test/harness.js';

const ADMIN = { uid: 'admin-uid', email: 'admin@qjume.app' };
const customer = (n: number) => ({ uid: `customer-${n}`, isAnonymous: true });

async function join(fx: Fixture, n: number) {
  return performJoinQueue(testDb, customer(n), {
    shopId: fx.shopId,
    queueId: fx.queueId,
    displayName: `Customer ${n}`,
  });
}

async function shop(fx: Fixture) {
  const snap = await testDb.doc(`shops/${fx.shopId}`).get();
  return snap.data() as { suspended: boolean; name: string };
}

async function auditEntries() {
  const snap = await testDb
    .collection('adminAuditLog')
    .orderBy('at')
    .get();
  return snap.docs.map((d) => d.data());
}

beforeEach(clearFirestore);

describe('suspendShop / reinstateShop', () => {
  it('takes every queue at the shop offline and back', async () => {
    const fx = await seedQueue();
    const secondRef = testDb
      .doc(`shops/${fx.shopId}`)
      .collection('queues')
      .doc();
    await secondRef.set(makeQueue({ name: 'Second line' }));

    await performSuspendShop(testDb, ADMIN, { shopId: fx.shopId });

    expect((await shop(fx)).suspended).toBe(true);
    expect((await getQueue(fx)).shopSuspended).toBe(true);
    expect((await secondRef.get()).data()?.['shopSuspended']).toBe(true);

    await performReinstateShop(testDb, ADMIN, { shopId: fx.shopId });

    expect((await shop(fx)).suspended).toBe(false);
    expect((await getQueue(fx)).shopSuspended).toBe(false);
    expect((await secondRef.get()).data()?.['shopSuspended']).toBe(false);
  });

  it('refuses new joiners while suspended, even a queue marked open', async () => {
    const fx = await seedQueue();
    await performSuspendShop(testDb, ADMIN, { shopId: fx.shopId });

    await expect(join(fx, 1)).rejects.toThrow(/not accepting/i);
  });

  it('does not stop staff serving who is already waiting', async () => {
    // A suspension is about new business, not bricking service mid-queue —
    // the same shape as invariant 4's offline handling.
    const fx = await seedQueue();
    const station = await seedStation(fx, 'Till 1');
    await join(fx, 1);
    await performSuspendShop(testDb, ADMIN, { shopId: fx.shopId });

    const called = await performCallNext(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId: station,
    });
    expect(called.displayName).toBe('Customer 1');
  });

  it('a queue created under a suspended shop is born suspended', async () => {
    const fx = await seedQueue();
    await performSuspendShop(testDb, ADMIN, { shopId: fx.shopId });

    const created = await performCreateQueue(testDb, OWNER_UID, {
      shopId: fx.shopId,
      name: 'New line',
      address: '1 Test Street',
      category: 'other',
      maxSize: 10,
      avgServiceTimeSeconds: 60,
      noShowPenalty: 'back',
    });

    const snap = await testDb
      .doc(`shops/${fx.shopId}/queues/${created.queueId}`)
      .get();
    expect(snap.data()?.['shopSuspended']).toBe(true);
  });

  it('records who suspended and reinstated the shop', async () => {
    const fx = await seedQueue();
    await performSuspendShop(testDb, ADMIN, { shopId: fx.shopId });
    await performReinstateShop(testDb, ADMIN, { shopId: fx.shopId });

    const entries = await auditEntries();
    expect(entries.map((e) => e['action'])).toEqual([
      'shop.suspend',
      'shop.reinstate',
    ]);
    expect(entries[0]).toMatchObject({
      adminUid: ADMIN.uid,
      adminEmail: ADMIN.email,
      shopId: fx.shopId,
    });
  });

  it('rejects an unknown shop', async () => {
    await expect(
      performSuspendShop(testDb, ADMIN, { shopId: 'no-such-shop' }),
    ).rejects.toThrow(/not found/i);
  });
});

describe('adminUpdateShop', () => {
  it('edits the shop and logs only the fields that changed', async () => {
    const fx = await seedQueue({ name: 'Old Name', exclusiveQueues: false });

    await performAdminUpdateShop(testDb, ADMIN, {
      shopId: fx.shopId,
      name: 'New Name',
      exclusiveQueues: false,
    });

    expect((await shop(fx)).name).toBe('New Name');
    const [entry] = await auditEntries();
    expect(entry?.['action']).toBe('shop.update');
    expect(Object.keys(entry?.['changes'] as object)).toEqual(['name']);
  });

  it('cannot be used to change the plan', async () => {
    // performAdminUpdateShop's request type has no `plan` field at all —
    // this proves a client cannot smuggle one through regardless.
    const fx = await seedQueue({ plan: 'free' });

    await performAdminUpdateShop(testDb, ADMIN, {
      shopId: fx.shopId,
      name: 'Renamed Shop',
      exclusiveQueues: false,
      // @ts-expect-error -- plan is intentionally not part of this request
      plan: 'paid',
    });

    const snap = await testDb.doc(`shops/${fx.shopId}`).get();
    expect(snap.data()?.['plan']).toBe('free');
  });
});

describe('adminUpdateQueue', () => {
  it('edits any queue and logs the changed fields', async () => {
    const fx = await seedQueue();

    await performAdminUpdateQueue(testDb, ADMIN, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      name: 'Renamed Queue',
      address: '1 Test Street',
      category: 'other',
      maxSize: 1000,
      avgServiceTimeSeconds: 300,
      noShowPenalty: 'back',
    });

    expect((await getQueue(fx)).name).toBe('Renamed Queue');
    const [entry] = await auditEntries();
    expect(entry?.['action']).toBe('queue.update');
    expect(Object.keys(entry?.['changes'] as object)).toEqual(['name']);
  });
});

describe('adminDeleteShop', () => {
  it('removes the shop and everything beneath it', async () => {
    const fx = await seedQueue();
    await join(fx, 1);

    await performAdminDeleteShop(testDb, ADMIN, { shopId: fx.shopId });

    expect((await testDb.doc(`shops/${fx.shopId}`).get()).exists).toBe(false);
    expect(
      (await testDb.doc(`shops/${fx.shopId}/queues/${fx.queueId}`).get())
        .exists,
    ).toBe(false);
    const tickets = await testDb
      .collection(`shops/${fx.shopId}/queues/${fx.queueId}/tickets`)
      .get();
    expect(tickets.empty).toBe(true);
  });

  it('logs the deletion in a place the deletion cannot reach', async () => {
    const fx = await seedQueue({ name: 'Doomed Shop' });
    await performAdminDeleteShop(testDb, ADMIN, { shopId: fx.shopId });

    const [entry] = await auditEntries();
    expect(entry).toMatchObject({ action: 'shop.delete', shopId: fx.shopId });
    expect(entry?.['summary']).toContain('Doomed Shop');
  });

  it('rejects an unknown shop', async () => {
    await expect(
      performAdminDeleteShop(testDb, ADMIN, { shopId: 'no-such-shop' }),
    ).rejects.toThrow(/not found/i);
  });
});
