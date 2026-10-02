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
// The plan only changes through a verified payment. The free plan has every
// feature; what it limits is the count of services (see freeServices.test).
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

  it('lets a shop with several queues go back to free', async () => {
    // The free plan is the whole app now, so nothing a paid shop can have is
    // out of bounds on free — only the count of services is.
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

    await performCompleteCheckout(testDb, OWNER_UID, { sessionId }, payments);
    expect(await planOf(shopId)).toBe('free');
  });
});

describe('the free plan is the whole app', () => {
  it('several queues', async () => {
    const shopId = await seedShop('free');
    await performCreateQueue(testDb, OWNER_UID, { shopId, ...settings });
    await expect(
      performCreateQueue(testDb, OWNER_UID, { shopId, ...settings }),
    ).resolves.toHaveProperty('queueId');
  });

  it('several tills', async () => {
    const fx = await seedQueue({ plan: 'free' });
    await performClaimStation(testDb, OWNER_UID, { shopId: fx.shopId, queueId: fx.queueId });
    await expect(
      performClaimStation(testDb, OWNER_UID, { shopId: fx.shopId, queueId: fx.queueId }),
    ).resolves.toHaveProperty('stationId');
  });

  it('more than twenty people waiting, joined or walked in', async () => {
    const fx = await seedQueue({ plan: 'free' }, { waitingCount: 20 });
    await expect(
      performJoinQueue(
        testDb,
        { uid: 'someone', isAnonymous: true },
        { shopId: fx.shopId, queueId: fx.queueId, displayName: 'Late' },
      ),
    ).resolves.toHaveProperty('ticketId');
    await expect(
      performAddWalkIn(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        displayName: 'Walk-in',
      }),
    ).resolves.toHaveProperty('ticketId');
  });

  it('staff members', async () => {
    const shopId = await seedShop('free');
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

  it('keeps staff serving when the shop drops to free', async () => {
    // Staff are part of the whole app on every plan, so a downgrade changes
    // nothing for them.
    const fx = await paidShopWithStaff();
    await testDb.doc(`shops/${fx.shopId}`).update({ plan: 'free' });

    await expect(
      performAddWalkIn(testDb, STAFF_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        displayName: 'Walk-in',
      }),
    ).resolves.toHaveProperty('ticketId');
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
