import { beforeEach, describe, expect, it } from 'vitest';
import { performCreateQueue } from './createQueue.js';
import { performUpdateQueue } from './updateQueue.js';
import { performClaimStation } from './claimStation.js';
import { performCloseQueue } from './closeQueue.js';
import { performAddWalkIn } from '../queue/addWalkIn.js';
import { performRelinkTicket } from '../queue/relinkTicket.js';
import { performJoinQueue } from '../queue/joinQueue.js';
import { hashResumeCode } from '../queue/resumeCode.js';
import {
  OWNER_UID,
  clearFirestore,
  getQueue,
  makeShop,
  seedQueue,
  testDb,
  ticketContact,
  waitingOrder,
  type Fixture,
} from '../test/harness.js';
import type { Queue, Ticket } from '../../../src/types/index.js';

beforeEach(clearFirestore);

async function seedShop(plan: 'free' | 'paid' = 'paid'): Promise<string> {
  const ref = testDb.collection('shops').doc();
  await ref.set(makeShop({ plan }));
  return ref.id;
}

const settings = {
  name: 'Prescriptions',
  address: '1 Test Street',
  category: 'health-and-medical',
  maxSize: 50,
  avgServiceTimeSeconds: 300,
  noShowPenalty: 'back3',
} as const;

describe('createQueue', () => {
  it('creates a queue closed, with counters zeroed', async () => {
    const shopId = await seedShop();
    const { queueId } = await performCreateQueue(testDb, OWNER_UID, {
      shopId,
      ...settings,
    });

    const snap = await testDb.doc(`shops/${shopId}/queues/${queueId}`).get();
    const queue = snap.data() as Queue;
    // A new queue must not silently start taking joiners.
    expect(queue.status).toBe('closed');
    expect(queue.waitingCount).toBe(0);
    expect(queue.lastIssuedNumber).toBe(0);
    expect(queue.lastPosition).toBe(0);
  });

  it('enforces the free-tier one-queue limit server-side', async () => {
    const shopId = await seedShop('free');
    await performCreateQueue(testDb, OWNER_UID, { shopId, ...settings });
    await expect(
      performCreateQueue(testDb, OWNER_UID, { shopId, ...settings }),
    ).rejects.toThrow(/one queue/i);
  });

  it('lets a paid shop create several queues', async () => {
    const shopId = await seedShop('paid');
    await performCreateQueue(testDb, OWNER_UID, { shopId, ...settings });
    await expect(
      performCreateQueue(testDb, OWNER_UID, { shopId, ...settings }),
    ).resolves.toHaveProperty('queueId');
  });

  it('geocodes the address at save time', async () => {
    const shopId = await seedShop();
    const { queueId, geocoded } = await performCreateQueue(testDb, OWNER_UID, {
      shopId,
      ...settings,
    });

    expect(geocoded).not.toBeNull();
    const snap = await testDb.doc(`shops/${shopId}/queues/${queueId}`).get();
    const queue = snap.data() as Queue;
    expect(queue.lat).toBeCloseTo(geocoded!.lat, 6);
    expect(queue.lng).toBeCloseTo(geocoded!.lng, 6);
    // The geohash is what radius queries index on; without it the queue is
    // invisible to distance search.
    expect(queue.geohash).toMatch(/^[0-9a-z]{10}$/);
  });

  it('rejects a non-owner', async () => {
    const shopId = await seedShop();
    await expect(
      performCreateQueue(testDb, 'someone-else', { shopId, ...settings }),
    ).rejects.toThrow(/shop owner/i);
  });

  it.each([
    ['an unknown category', { category: 'nonsense' as never }],
    ['a zero max size', { maxSize: 0 }],
    ['a negative service time', { avgServiceTimeSeconds: -1 }],
    ['a blank name', { name: '   ' }],
  ])('rejects %s', async (_label, override) => {
    const shopId = await seedShop();
    await expect(
      performCreateQueue(testDb, OWNER_UID, {
        shopId,
        ...settings,
        ...override,
      }),
    ).rejects.toThrow();
  });
});

describe('claimStation', () => {
  it('opens a station and labels it', async () => {
    const fx = await seedQueue();
    const result = await performClaimStation(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      label: 'Till 2',
    });
    expect(result.label).toBe('Till 2');
  });

  it('enforces one server at a time on the free tier', async () => {
    const fx = await seedQueue({ plan: 'free' });
    await performClaimStation(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
    });
    await expect(
      performClaimStation(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
      }),
    ).rejects.toThrow(/one customer at a time/i);
  });

  it('lets a free-tier shop reclaim its existing station', async () => {
    // Coming back after a reload must not count as opening a second station.
    const fx = await seedQueue({ plan: 'free' });
    const first = await performClaimStation(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
    });
    await expect(
      performClaimStation(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        stationId: first.stationId,
      }),
    ).resolves.toMatchObject({ stationId: first.stationId });
  });

  it('lets a paid shop run parallel stations', async () => {
    const fx = await seedQueue({ plan: 'paid' });
    await performClaimStation(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
    });
    await expect(
      performClaimStation(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
      }),
    ).resolves.toHaveProperty('stationId');
  });
});

describe('closeQueue', () => {
  const join = (fx: Fixture, n: number) =>
    performJoinQueue(
      testDb,
      { uid: `customer-${n}`, isAnonymous: true },
      { shopId: fx.shopId, queueId: fx.queueId, displayName: `Customer ${n}` },
    );

  it('drains without turning anyone away', async () => {
    const fx = await seedQueue();
    await join(fx, 1);
    await join(fx, 2);

    const result = await performCloseQueue(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      mode: 'drain',
    });

    expect(result.clearedCount).toBe(0);
    const queue = await getQueue(fx);
    expect(queue.status).toBe('drainMode');
    // Everyone already waiting keeps their place.
    expect(queue.waitingCount).toBe(2);
    expect(await waitingOrder(fx)).toHaveLength(2);
  });

  it('refuses remote joiners once draining, but not walk-ins', async () => {
    const fx = await seedQueue();
    await join(fx, 1);
    await performCloseQueue(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      mode: 'drain',
    });

    await expect(join(fx, 2)).rejects.toThrow(/not accepting/i);
    await expect(
      performAddWalkIn(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        displayName: 'At the counter',
      }),
    ).resolves.toHaveProperty('ticketId');
  });

  it('clears the queue on a hard close', async () => {
    const fx = await seedQueue();
    await join(fx, 1);
    await join(fx, 2);

    const result = await performCloseQueue(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      mode: 'hard',
    });

    expect(result.clearedCount).toBe(2);
    const queue = await getQueue(fx);
    expect(queue.status).toBe('closed');
    expect(queue.waitingCount).toBe(0);
    expect(await waitingOrder(fx)).toEqual([]);
  });

  it('rejects a non-owner', async () => {
    const fx = await seedQueue();
    await expect(
      performCloseQueue(testDb, 'someone-else', {
        shopId: fx.shopId,
        queueId: fx.queueId,
        mode: 'hard',
      }),
    ).rejects.toThrow(/not serving this shop/i);
  });
});

describe('addWalkIn', () => {
  it('places a walk-in in the same queue, in turn', async () => {
    const fx = await seedQueue();
    await performJoinQueue(
      testDb,
      { uid: 'customer-1', isAnonymous: true },
      { shopId: fx.shopId, queueId: fx.queueId, displayName: 'Remote joiner' },
    );
    const walkIn = await performAddWalkIn(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      displayName: 'Walk-in',
    });

    // No separate walk-in line and no preferential treatment: one queue, one
    // order. The walk-in joined second, so they are second.
    expect(walkIn.number).toBe(2);
    expect(await waitingOrder(fx)).toEqual(['Remote joiner', 'Walk-in']);
    expect((await getQueue(fx)).waitingCount).toBe(2);
  });

  it('issues a resume code the walk-in can claim later', async () => {
    const fx = await seedQueue();
    const walkIn = await performAddWalkIn(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      displayName: 'Walk-in',
    });

    const snap = await testDb
      .doc(`shops/${fx.shopId}/queues/${fx.queueId}/tickets/${walkIn.ticketId}`)
      .get();
    const ticket = snap.data() as Ticket;
    // Nobody holds it on a device, so there is no account to key it to.
    expect(ticket.holderKey).toBeNull();

    const contact = await ticketContact(fx, walkIn.ticketId);
    expect(contact.customerUid).toBeNull();
    expect(contact.anonymousId).toBeNull();
    expect(contact.resumeCodeHash).toBe(
      hashResumeCode(fx.queueId, walkIn.resumeCode),
    );
  });

  it('still admits a walk-in while the queue is draining', async () => {
    // Drain stops remote joiners; someone at the counter can still be added.
    const fx = await seedQueue({}, { status: 'drainMode' });
    await expect(
      performAddWalkIn(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        displayName: 'Late arrival',
      }),
    ).resolves.toHaveProperty('number', 1);
    expect(await waitingOrder(fx)).toEqual(['Late arrival']);
  });

  it.each(['paused', 'closed', 'unavailable'] as const)(
    'refuses a walk-in while %s',
    async (status) => {
      const fx = await seedQueue({}, { status });
      await expect(
        performAddWalkIn(testDb, OWNER_UID, {
          shopId: fx.shopId,
          queueId: fx.queueId,
          displayName: 'Walk-in',
        }),
      ).rejects.toThrow(/not accepting/i);
    },
  );

  it('rejects a non-owner', async () => {
    const fx = await seedQueue();
    await expect(
      performAddWalkIn(testDb, 'someone-else', {
        shopId: fx.shopId,
        queueId: fx.queueId,
        displayName: 'Walk-in',
      }),
    ).rejects.toThrow(/not serving this shop/i);
  });
});

describe('relinkTicket', () => {
  it('issues a fresh code and invalidates the old one', async () => {
    const fx = await seedQueue();
    const joined = await performJoinQueue(
      testDb,
      { uid: 'customer-1', isAnonymous: true },
      { shopId: fx.shopId, queueId: fx.queueId, displayName: 'Marta' },
    );

    const relinked = await performRelinkTicket(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: joined.ticketId,
    });

    expect(relinked.displayName).toBe('Marta');
    expect(relinked.resumeCode).not.toBe(joined.resumeCode);

    const contact = await ticketContact(fx, joined.ticketId);
    expect(contact.resumeCodeHash).toBe(
      hashResumeCode(fx.queueId, relinked.resumeCode),
    );
    // Whoever held the old code can no longer claim this ticket.
    expect(contact.resumeCodeHash).not.toBe(
      hashResumeCode(fx.queueId, joined.resumeCode),
    );
  });

  it('rejects a non-owner', async () => {
    const fx = await seedQueue();
    const joined = await performJoinQueue(
      testDb,
      { uid: 'customer-1', isAnonymous: true },
      { shopId: fx.shopId, queueId: fx.queueId, displayName: 'Marta' },
    );
    await expect(
      performRelinkTicket(testDb, 'someone-else', {
        shopId: fx.shopId,
        queueId: fx.queueId,
        ticketId: joined.ticketId,
      }),
    ).rejects.toThrow(/not serving this shop/i);
  });
});

describe('updateQueue', () => {
  async function createdQueue() {
    const shopId = await seedShop();
    const { queueId } = await performCreateQueue(testDb, OWNER_UID, {
      shopId,
      ...settings,
    });
    return { shopId, queueId };
  }

  async function read(shopId: string, queueId: string): Promise<Queue> {
    const snap = await testDb.doc(`shops/${shopId}/queues/${queueId}`).get();
    return snap.data() as Queue;
  }

  it('re-geocodes when the address changes', async () => {
    const { shopId, queueId } = await createdQueue();
    const before = await read(shopId, queueId);

    const result = await performUpdateQueue(testDb, OWNER_UID, {
      shopId,
      queueId,
      ...settings,
      address: '99 Somewhere Else',
    });

    expect(result.geocoded).not.toBeNull();
    const after = await read(shopId, queueId);
    expect(after.address).toBe('99 Somewhere Else');
    // The coordinates must move with the address, never lag behind it.
    expect(after.geohash).not.toBe(before.geohash);
    expect(after.lat).toBeCloseTo(result.geocoded!.lat, 6);
  });

  it('does not re-geocode when the address is unchanged', async () => {
    const { shopId, queueId } = await createdQueue();
    const before = await read(shopId, queueId);

    const result = await performUpdateQueue(testDb, OWNER_UID, {
      shopId,
      queueId,
      ...settings,
      name: 'Renamed',
    });

    expect(result.geocoded).toBeNull();
    const after = await read(shopId, queueId);
    expect(after.name).toBe('Renamed');
    expect(after.geohash).toBe(before.geohash);
  });

  it('leaves the counters alone', async () => {
    const { shopId, queueId } = await createdQueue();
    await testDb
      .doc(`shops/${shopId}/queues/${queueId}`)
      .update({ waitingCount: 4, lastPosition: 4000, status: 'open' });

    await performUpdateQueue(testDb, OWNER_UID, {
      shopId,
      queueId,
      ...settings,
      name: 'Renamed',
    });

    const after = await read(shopId, queueId);
    expect(after.waitingCount).toBe(4);
    expect(after.lastPosition).toBe(4000);
    expect(after.status).toBe('open');
  });

  it('rejects a non-owner', async () => {
    const { shopId, queueId } = await createdQueue();
    await expect(
      performUpdateQueue(testDb, 'someone-else', {
        shopId,
        queueId,
        ...settings,
      }),
    ).rejects.toThrow(/shop owner/i);
  });
});
