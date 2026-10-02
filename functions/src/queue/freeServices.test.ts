import { beforeEach, describe, expect, it } from 'vitest';
import { performJoinQueue } from './joinQueue.js';
import { performAddWalkIn } from './addWalkIn.js';
import { performCallNext } from './callNext.js';
import { performGrantFreeServices } from '../admin/grantFreeServices.js';
import { recordingChannels } from '../notifications/channels.js';
import {
  OWNER_UID,
  clearFirestore,
  seedQueue,
  seedStation,
  testDb,
  type Fixture,
} from '../test/harness.js';
import { FREE_SERVICES_DEFAULT, type Queue, type Shop } from '../../../src/types/index.js';

const admin = { uid: 'admin-uid', email: 'admin@example.com' };
let n = 0;

beforeEach(async () => {
  await clearFirestore();
  n = 0;
});

const join = (fx: Fixture) =>
  performJoinQueue(
    testDb,
    { uid: `phone-${++n}`, isAnonymous: true },
    { shopId: fx.shopId, queueId: fx.queueId, displayName: `Customer ${n}` },
  );

const next = (fx: Fixture, station: string, outcome?: 'noShow') =>
  performCallNext(
    testDb,
    OWNER_UID,
    { shopId: fx.shopId, queueId: fx.queueId, stationId: station, ...(outcome ? { outcome } : {}) },
    recordingChannels([]),
  );

const shopOf = async (fx: Fixture) =>
  (await testDb.doc(`shops/${fx.shopId}`).get()).data() as Shop;
const queueOf = async (fx: Fixture) =>
  (await testDb.doc(`shops/${fx.shopId}/queues/${fx.queueId}`).get()).data() as Queue;

describe('the free-services counter', () => {
  it('counts one per customer marked served, and nothing for a no-show', async () => {
    const fx = await seedQueue();
    const station = await seedStation(fx, 'Till 1');
    await join(fx);
    await join(fx);

    await next(fx, station); // calls 1, nobody served yet
    expect((await shopOf(fx)).servicesUsed ?? 0).toBe(0);
    await next(fx, station); // 1 served, calls 2
    await next(fx, station, 'noShow'); // 2 is a no-show: not a service
    expect((await shopOf(fx)).servicesUsed).toBe(1);
  });

  it('starts every shop on the default allowance', async () => {
    const fx = await seedQueue();
    const shop = await shopOf(fx);
    expect(shop.freeServicesGranted ?? FREE_SERVICES_DEFAULT).toBe(1000);
  });

  it('stops new customers when the last free one is used, but staff go on serving', async () => {
    const fx = await seedQueue({ plan: 'free', freeServicesGranted: 1, servicesUsed: 0 });
    const station = await seedStation(fx, 'Till 1');
    await join(fx);
    await join(fx);
    await next(fx, station); // calls 1
    await next(fx, station); // serves 1 — the last free service — calls 2

    await expect(join(fx)).rejects.toThrow(/not taking new customers/i);
    await expect(
      performAddWalkIn(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        displayName: 'Walk-in',
      }),
    ).rejects.toThrow(/free services are used up/i);
    // Whoever is already waiting is still served.
    await expect(next(fx, station)).resolves.toBeDefined();
    // And discovery stops offering the queue.
    expect((await queueOf(fx)).shopOutOfFreeServices).toBe(true);
  });

  it('does not limit a shop with a subscription', async () => {
    const fx = await seedQueue({ plan: 'paid', freeServicesGranted: 1, servicesUsed: 50 });
    await expect(join(fx)).resolves.toHaveProperty('ticketId');
  });

  it('lets a platform admin grant more, logged, and the shop takes customers again', async () => {
    const fx = await seedQueue({ plan: 'free', freeServicesGranted: 3, servicesUsed: 3 });
    await testDb
      .doc(`shops/${fx.shopId}/queues/${fx.queueId}`)
      .update({ shopOutOfFreeServices: true });

    const result = await performGrantFreeServices(testDb, admin, {
      shopId: fx.shopId,
      amount: 200,
    });

    expect(result).toEqual({ freeServicesGranted: 203 });
    await expect(join(fx)).resolves.toHaveProperty('ticketId');
    expect((await queueOf(fx)).shopOutOfFreeServices).toBe(false);
    const log = await testDb.collection('adminAuditLog').get();
    expect(log.docs.map((d) => d.data())).toEqual([
      expect.objectContaining({
        action: 'shop.grantFreeServices',
        shopId: fx.shopId,
        changes: { freeServicesGranted: { before: 3, after: 203 } },
      }),
    ]);
  });

  it('grants on top of the default for a shop that predates the counter', async () => {
    const fx = await seedQueue();
    const result = await performGrantFreeServices(testDb, admin, {
      shopId: fx.shopId,
      amount: 500,
    });
    expect(result.freeServicesGranted).toBe(1500);
  });

  it('refuses a grant that is not a sensible whole number', async () => {
    const fx = await seedQueue();
    for (const amount of [0, -5, 1.5, 1_000_000]) {
      await expect(
        performGrantFreeServices(testDb, admin, { shopId: fx.shopId, amount }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    }
  });
});
