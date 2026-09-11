import { beforeEach, describe, expect, it } from 'vitest';
import {
  performCompleteCheckout,
  performStartCheckout,
} from './checkout.js';
import { stubPayments } from './stub.js';
import { performCreateQueue } from '../shop/createQueue.js';
import { performClaimStation } from '../shop/claimStation.js';
import { performAddStaff, performRemoveStaff } from '../shop/staff.js';
import { performCallNext } from '../queue/callNext.js';
import { performAddWalkIn } from '../queue/addWalkIn.js';
import { performJoinQueue } from '../queue/joinQueue.js';
import { recordingChannels } from '../notifications/channels.js';
import {
  OWNER_UID,
  clearFirestore,
  makeShop,
  seedQueue,
  seedStation,
  testDb,
} from '../test/harness.js';
import type { Shop } from '../../../src/types/index.js';

const payments = stubPayments('test-secret');
const STAFF_UID = 'staff-uid';

beforeEach(clearFirestore);

async function seedShop(plan: 'free' | 'paid' = 'free'): Promise<string> {
  const ref = testDb.collection('shops').doc();
  await ref.set(makeShop({ plan }));
  return ref.id;
}

const planOf = async (shopId: string): Promise<string> =>
  ((await testDb.doc(`shops/${shopId}`).get()).data() as Shop).plan;

const settings = {
  name: 'Counter',
  address: '1 Test Street',
  category: 'other',
  maxSize: 50,
  avgServiceTimeSeconds: 300,
  noShowPenalty: 'back',
} as const;

// ---------------------------------------------------------------------------
// Phase 7's whole point: a free shop cannot exceed its limits by any
// client-side manipulation. Every limit below is enforced by a function
// reading shop.plan, which is why that field is server-owned.
// ---------------------------------------------------------------------------
describe('a plan changes only through a verified payment', () => {
  it('upgrades when the provider confirms the session', async () => {
    const shopId = await seedShop('free');
    const { url } = await performStartCheckout(
      testDb,
      OWNER_UID,
      { shopId, plan: 'paid' },
      payments,
    );
    const sessionId = new URL(url, 'http://x').searchParams.get('session')!;

    await performCompleteCheckout(testDb, OWNER_UID, { sessionId }, payments);
    expect(await planOf(shopId)).toBe('paid');
  });

  it('refuses a session the provider does not recognise', async () => {
    const shopId = await seedShop('free');
    await expect(
      performCompleteCheckout(
        testDb,
        OWNER_UID,
        { sessionId: `stub_${shopId}_paid_${'0'.repeat(32)}` },
        payments,
      ),
    ).rejects.toThrow(/could not be verified/i);
    expect(await planOf(shopId)).toBe('free');
  });

  it('refuses a session invented from nothing', async () => {
    const shopId = await seedShop('free');
    await expect(
      performCompleteCheckout(testDb, OWNER_UID, { sessionId: 'paid-please' }, payments),
    ).rejects.toThrow(/could not be verified/i);
    expect(await planOf(shopId)).toBe('free');
  });

  it('takes the plan from the provider, never from the caller', async () => {
    // The session id decides which shop and which plan. Nothing in the request
    // says "make me paid".
    const mine = await seedShop('free');
    const theirs = await seedShop('free');
    const { url } = await performStartCheckout(
      testDb,
      OWNER_UID,
      { shopId: theirs, plan: 'paid' },
      payments,
    );
    const sessionId = new URL(url, 'http://x').searchParams.get('session')!;

    await performCompleteCheckout(testDb, OWNER_UID, { sessionId }, payments);
    expect(await planOf(theirs)).toBe('paid');
    expect(await planOf(mine)).toBe('free');
  });

  it('refuses to start checkout for a shop you do not own', async () => {
    const shopId = await seedShop('free');
    await expect(
      performStartCheckout(testDb, 'someone-else', { shopId, plan: 'paid' }, payments),
    ).rejects.toThrow(/shop owner/i);
  });

  it('refuses to complete a checkout for a shop you do not own', async () => {
    const shopId = await seedShop('free');
    const { url } = await performStartCheckout(
      testDb,
      OWNER_UID,
      { shopId, plan: 'paid' },
      payments,
    );
    const sessionId = new URL(url, 'http://x').searchParams.get('session')!;

    await expect(
      performCompleteCheckout(testDb, 'someone-else', { sessionId }, payments),
    ).rejects.toThrow(/shop owner/i);
    expect(await planOf(shopId)).toBe('free');
  });

  it('blocks a downgrade that would leave the shop over its limits', async () => {
    // Otherwise the shop lands in a state the free tier forbids and no code
    // path can produce — with queues nobody could legitimately have created.
    const shopId = await seedShop('paid');
    await performCreateQueue(testDb, OWNER_UID, { shopId, ...settings });
    await performCreateQueue(testDb, OWNER_UID, { shopId, ...settings });

    const { url } = await performStartCheckout(
      testDb,
      OWNER_UID,
      { shopId, plan: 'free' },
      payments,
    );
    const sessionId = new URL(url, 'http://x').searchParams.get('session')!;

    await expect(
      performCompleteCheckout(testDb, OWNER_UID, { sessionId }, payments),
    ).rejects.toThrow(/Delete all but/i);
    expect(await planOf(shopId)).toBe('paid');
  });
});

describe('what the free tier actually withholds', () => {
  it('a second queue', async () => {
    const shopId = await seedShop('free');
    await performCreateQueue(testDb, OWNER_UID, { shopId, ...settings });
    await expect(
      performCreateQueue(testDb, OWNER_UID, { shopId, ...settings }),
    ).rejects.toThrow(/one queue/i);
  });

  it('a second station', async () => {
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

  it('a twenty-first person waiting', async () => {
    const fx = await seedQueue({ plan: 'free' }, { waitingCount: 20 });
    await expect(
      performJoinQueue(
        testDb,
        { uid: 'someone', isAnonymous: true },
        { shopId: fx.shopId, queueId: fx.queueId, displayName: 'Late' },
      ),
    ).rejects.toThrow(/reached its limit/i);
  });

  it('a twenty-first walk-in, added at the counter', async () => {
    const fx = await seedQueue({ plan: 'free' }, { waitingCount: 20 });
    await expect(
      performAddWalkIn(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        displayName: 'Late',
      }),
    ).rejects.toThrow(/reached its limit/i);
  });

  it('staff members', async () => {
    const shopId = await seedShop('free');
    await expect(
      performAddStaff(testDb, OWNER_UID, { shopId, email: 'staff@example.com' }, async () => STAFF_UID),
    ).rejects.toThrow(/paid plan/i);
  });

  it('and grants all of them once the plan is paid', async () => {
    const shopId = await seedShop('paid');
    await expect(
      performCreateQueue(testDb, OWNER_UID, { shopId, ...settings }),
    ).resolves.toHaveProperty('queueId');
    await expect(
      performAddStaff(testDb, OWNER_UID, { shopId, email: 'staff@example.com' }, async () => STAFF_UID),
    ).resolves.toEqual({ uid: STAFF_UID });
  });
});

describe('staff can serve but not change anything', () => {
  async function paidShopWithStaff() {
    const fx = await seedQueue({ plan: 'paid' });
    await performAddStaff(
      testDb,
      OWNER_UID,
      { shopId: fx.shopId, email: 'staff@example.com' },
      async () => STAFF_UID,
    );
    return fx;
  }

  it('lets staff call the next customer', async () => {
    const fx = await paidShopWithStaff();
    await performJoinQueue(
      testDb,
      { uid: 'customer-1', isAnonymous: true },
      { shopId: fx.shopId, queueId: fx.queueId, displayName: 'Ann' },
    );
    const station = await seedStation(fx, 'Till 1');

    await expect(
      performCallNext(
        testDb,
        STAFF_UID,
        { shopId: fx.shopId, queueId: fx.queueId, stationId: station },
        recordingChannels([]),
      ),
    ).resolves.toMatchObject({ displayName: 'Ann' });
  });

  it('lets staff add a walk-in', async () => {
    const fx = await paidShopWithStaff();
    await expect(
      performAddWalkIn(testDb, STAFF_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        displayName: 'Walk-in',
      }),
    ).resolves.toHaveProperty('ticketId');
  });

  it('refuses staff the queue settings', async () => {
    const fx = await paidShopWithStaff();
    await expect(
      performCreateQueue(testDb, STAFF_UID, { shopId: fx.shopId, ...settings }),
    ).rejects.toThrow(/owner/i);
  });

  it('refuses staff the billing', async () => {
    const fx = await paidShopWithStaff();
    await expect(
      performStartCheckout(testDb, STAFF_UID, { shopId: fx.shopId, plan: 'free' }, payments),
    ).rejects.toThrow(/owner/i);
  });

  it('refuses staff the ability to add more staff', async () => {
    const fx = await paidShopWithStaff();
    await expect(
      performAddStaff(
        testDb,
        STAFF_UID,
        { shopId: fx.shopId, email: 'friend@example.com' },
        async () => 'friend-uid',
      ),
    ).rejects.toThrow(/owner/i);
  });

  it('cuts staff off the moment the shop drops to free', async () => {
    // A staff record on a free shop must grant nothing, or a downgrade would
    // leave people quietly still able to serve.
    const fx = await paidShopWithStaff();
    await testDb.doc(`shops/${fx.shopId}`).update({ plan: 'free' });

    await expect(
      performAddWalkIn(testDb, STAFF_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        displayName: 'Walk-in',
      }),
    ).rejects.toThrow(/not serving this shop/i);
  });

  it('cuts them off when removed', async () => {
    const fx = await paidShopWithStaff();
    await performRemoveStaff(testDb, OWNER_UID, {
      shopId: fx.shopId,
      uid: STAFF_UID,
    });

    await expect(
      performAddWalkIn(testDb, STAFF_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        displayName: 'Walk-in',
      }),
    ).rejects.toThrow(/not serving this shop/i);
  });

  it('refuses a stranger entirely', async () => {
    const fx = await paidShopWithStaff();
    await expect(
      performAddWalkIn(testDb, 'nobody', {
        shopId: fx.shopId,
        queueId: fx.queueId,
        displayName: 'Walk-in',
      }),
    ).rejects.toThrow(/not serving this shop/i);
  });
});
