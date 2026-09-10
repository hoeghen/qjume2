import { beforeEach, describe, expect, it } from 'vitest';
import { performCreateQueue } from './createQueue.js';
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
    // Geocoding is Phase 3; absent, not zeroed.
    expect(queue.lat).toBeNull();
    expect(queue.geohash).toBeNull();
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
    ).rejects.toThrow(/shop owner/i);
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
    expect(ticket.customerUid).toBeNull();
    expect(ticket.anonymousId).toBeNull();
    expect(ticket.resumeCodeHash).toBe(
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
    ).rejects.toThrow(/shop owner/i);
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

    const snap = await testDb
      .doc(`shops/${fx.shopId}/queues/${fx.queueId}/tickets/${joined.ticketId}`)
      .get();
    const ticket = snap.data() as Ticket;
    expect(ticket.resumeCodeHash).toBe(
      hashResumeCode(fx.queueId, relinked.resumeCode),
    );
    // Whoever held the old code can no longer claim this ticket.
    expect(ticket.resumeCodeHash).not.toBe(
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
    ).rejects.toThrow(/shop owner/i);
  });
});
