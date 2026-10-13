import { beforeEach, describe, expect, it } from 'vitest';
import { performCompleteCheckout, performStartCheckout } from './checkout.js';
import { mobilepayProvider } from './mobilepay.js';
import { providerForSession } from './index.js';
import {
  MobilePayApiError,
  type AgreementStatus,
  type CreateAgreementRequest,
  type CreateChargeRequest,
  type MobilePayApi,
} from './mobilepayApi.js';
import { performMobilePayWebhookEvent } from './mobilepayWebhook.js';
import { performChargeMobilePaySubscriptions } from './mobilepayCharges.js';
import { performRegisterMobilePayWebhook } from '../admin/registerMobilePayWebhook.js';
import { OWNER_UID, clearFirestore, makeShop, testDb } from '../test/harness.js';
import type {
  MobilePayBillingSession,
  MobilePaySubscription,
  Shop,
} from '../../../src/types/index.js';

beforeEach(clearFirestore);

const ENV = { MOBILEPAY_PRICE_ORE: '12500', APP_BASE_URL: 'https://qjume.dk' };

/** MobilePay as far as this app can see it: agreements, and charges made on them. */
function fakeMobilePay() {
  const agreements = new Map<string, AgreementStatus>();
  const created: CreateAgreementRequest[] = [];
  const charges: (CreateChargeRequest & { agreementId: string })[] = [];
  const stopped: string[] = [];
  const webhooks: { id: string; url: string }[] = [];
  let refuseCharges = false;
  let n = 0;

  const api: MobilePayApi = {
    async createAgreement(request) {
      const agreementId = `agr_${++n}`;
      agreements.set(agreementId, 'PENDING');
      created.push(request);
      return { agreementId, vippsConfirmationUrl: `https://pay.example/${agreementId}` };
    },
    async getAgreement(agreementId) {
      return { status: agreements.get(agreementId) ?? 'EXPIRED' };
    },
    async stopAgreement(agreementId) {
      stopped.push(agreementId);
      agreements.set(agreementId, 'STOPPED');
    },
    async createCharge(agreementId, request) {
      if (refuseCharges) throw new MobilePayApiError(400, 'refused', 'create charge');
      charges.push({ agreementId, ...request });
    },
    async listWebhooks() {
      return [...webhooks];
    },
    async registerWebhook(url) {
      const id = `wh_${++n}`;
      webhooks.push({ id, url });
      return { id, secret: `secret-${id}` };
    },
    async deleteWebhook(id) {
      webhooks.splice(webhooks.findIndex((w) => w.id === id), 1);
    },
  };

  return {
    api,
    webhooks,
    agreements,
    created,
    charges,
    stopped,
    refuseCharges: () => (refuseCharges = true),
    provider: () => mobilepayProvider(ENV, testDb, { api, sleep: async () => {} }),
  };
}

async function seedShop(plan: 'free' | 'paid' = 'free', ownerUid = OWNER_UID): Promise<string> {
  const ref = testDb.collection('shops').doc();
  await ref.set(makeShop({ plan, ownerUid }));
  return ref.id;
}

const shopOf = async (shopId: string) =>
  (await testDb.doc(`shops/${shopId}`).get()).data() as Shop;
const subscriptionOf = async (shopId: string) =>
  (await testDb.doc(`subscriptions/${shopId}`).get()).data() as MobilePaySubscription | undefined;

/** Starts a checkout and returns the session id MobilePay will redirect back with. */
async function startPaid(mp: ReturnType<typeof fakeMobilePay>, shopId: string) {
  const { url } = await performStartCheckout(
    testDb,
    OWNER_UID,
    { shopId, plan: 'paid' },
    mp.provider(),
  );
  const sessions = await testDb.collection('billingSessions').where('shopId', '==', shopId).get();
  const doc = sessions.docs[0]!;
  return { url, sessionId: doc.id, session: doc.data() as MobilePayBillingSession };
}

async function seedActive(mp: ReturnType<typeof fakeMobilePay>, nextChargeDue: string) {
  const shopId = await seedShop('paid');
  const agreementId = `agr_seeded_${shopId}`;
  mp.agreements.set(agreementId, 'ACTIVE');
  const subscription: MobilePaySubscription = {
    provider: 'mobilepay',
    shopId,
    agreementId,
    status: 'active',
    nextChargeDue,
    billingDay: Number(nextChargeDue.slice(8)),
    activatedAt: '2026-01-01T00:00:00.000Z',
  };
  await testDb.doc(`subscriptions/${shopId}`).set(subscription);
  return { shopId, agreementId };
}

describe('subscribing through MobilePay', () => {
  it('sends the owner to MobilePay with the price, first month up front', async () => {
    const mp = fakeMobilePay();
    const shopId = await seedShop();
    const { url, sessionId, session } = await startPaid(mp, shopId);

    expect(url).toBe(`https://pay.example/${session.agreementId}`);
    expect(mp.created[0]).toMatchObject({
      amount: 12500,
      merchantRedirectUrl: `https://qjume.dk/shop/billing?session=${sessionId}`,
    });
    expect(await shopOf(shopId)).toMatchObject({ plan: 'free' });
  });

  it('upgrades once the agreement is active, and schedules next month', async () => {
    const mp = fakeMobilePay();
    const shopId = await seedShop();
    const { sessionId, session } = await startPaid(mp, shopId);
    mp.agreements.set(session.agreementId, 'ACTIVE');

    await performCompleteCheckout(testDb, OWNER_UID, { sessionId }, mp.provider());

    expect((await shopOf(shopId)).plan).toBe('paid');
    const subscription = await subscriptionOf(shopId);
    expect(subscription).toMatchObject({ status: 'active', agreementId: session.agreementId });
    expect(subscription!.nextChargeDue! > new Date().toISOString().slice(0, 10)).toBe(true);
  });

  it('does not upgrade while the agreement is still pending', async () => {
    const mp = fakeMobilePay();
    const shopId = await seedShop();
    const { sessionId } = await startPaid(mp, shopId);

    await expect(
      performCompleteCheckout(testDb, OWNER_UID, { sessionId }, mp.provider()),
    ).rejects.toThrow(/could not be verified/i);
    expect((await shopOf(shopId)).plan).toBe('free');
  });

  it('waits out an agreement that activates a moment after the redirect', async () => {
    const mp = fakeMobilePay();
    const shopId = await seedShop();
    const { sessionId, session } = await startPaid(mp, shopId);
    const getAgreement = mp.api.getAgreement;
    let calls = 0;
    mp.api.getAgreement = async (id) => {
      if (++calls === 3) mp.agreements.set(session.agreementId, 'ACTIVE');
      return getAgreement(id);
    };

    await performCompleteCheckout(testDb, OWNER_UID, { sessionId }, mp.provider());
    expect((await shopOf(shopId)).plan).toBe('paid');
  });

  it('refuses a session invented from nothing', async () => {
    const mp = fakeMobilePay();
    await seedShop();
    await expect(
      performCompleteCheckout(testDb, OWNER_UID, { sessionId: 'mobilepay_nope' }, mp.provider()),
    ).rejects.toThrow(/could not be verified/i);
  });

  it("will not apply someone else's checkout to their shop for them", async () => {
    const mp = fakeMobilePay();
    const shopId = await seedShop('free', 'someone-else');
    const { url } = await performStartCheckout(
      testDb,
      'someone-else',
      { shopId, plan: 'paid' },
      mp.provider(),
    );
    const agreementId = url.split('/').pop()!;
    mp.agreements.set(agreementId, 'ACTIVE');
    const sessionId = (await testDb.collection('billingSessions').get()).docs[0]!.id;

    await expect(
      performCompleteCheckout(testDb, OWNER_UID, { sessionId }, mp.provider()),
    ).rejects.toThrow(/owner/i);
  });

  it('records the same agreement once, however many times it is confirmed', async () => {
    const mp = fakeMobilePay();
    const shopId = await seedShop();
    const { sessionId, session } = await startPaid(mp, shopId);
    mp.agreements.set(session.agreementId, 'ACTIVE');

    await performCompleteCheckout(testDb, OWNER_UID, { sessionId }, mp.provider());
    const first = await subscriptionOf(shopId);
    await performMobilePayWebhookEvent(testDb, mp.api, {
      eventType: 'recurring.agreement-activated.v1',
      agreementId: session.agreementId,
    });
    expect(await subscriptionOf(shopId)).toEqual(first);
  });

  it('routes a MobilePay session back to MobilePay, whatever new checkouts use', () => {
    const env = { ...ENV, PAYMENTS_PROVIDER: 'stub', MOBILEPAY_CLIENT_ID: 'id',
      MOBILEPAY_CLIENT_SECRET: 's', MOBILEPAY_SUBSCRIPTION_KEY: 'k', MOBILEPAY_MSN: '123' };
    expect(providerForSession('mobilepay_abc', env).name).toBe('mobilepay');
    expect(providerForSession('mobilepay-cancelled_abc', env).name).toBe('mobilepay');
    expect(providerForSession('stub_x', env).name).toBe('stub');
  });
});

describe('cancelling a MobilePay subscription', () => {
  it('stops the agreement and moves the shop to free', async () => {
    const mp = fakeMobilePay();
    const { shopId, agreementId } = await seedActive(mp, '2026-11-01');

    const { url } = await performStartCheckout(
      testDb,
      OWNER_UID,
      { shopId, plan: 'free' },
      mp.provider(),
    );
    expect(mp.stopped).toEqual([agreementId]);
    const sessionId = new URL(url, 'http://x').searchParams.get('session')!;
    await performCompleteCheckout(testDb, OWNER_UID, { sessionId }, mp.provider());

    expect((await shopOf(shopId)).plan).toBe('free');
    expect(await subscriptionOf(shopId)).toMatchObject({ status: 'stopped', nextChargeDue: null });
  });

  it("cannot be used to stop another shop's agreement", async () => {
    const mp = fakeMobilePay();
    const { shopId } = await seedActive(mp, '2026-11-01');

    await expect(
      performCompleteCheckout(
        testDb,
        'not-the-owner',
        { sessionId: `mobilepay-cancelled_${shopId}` },
        mp.provider(),
      ),
    ).rejects.toThrow(/owner/i);
    expect(mp.stopped).toEqual([]);
    expect((await shopOf(shopId)).plan).toBe('paid');
  });
});

describe('the MobilePay webhook', () => {
  it('upgrades a shop whose owner never came back from MobilePay', async () => {
    const mp = fakeMobilePay();
    const shopId = await seedShop();
    const { session } = await startPaid(mp, shopId);
    mp.agreements.set(session.agreementId, 'ACTIVE');

    await performMobilePayWebhookEvent(testDb, mp.api, {
      eventType: 'recurring.agreement-activated.v1',
      agreementId: session.agreementId,
    });
    expect((await shopOf(shopId)).plan).toBe('paid');
  });

  it('does not revive an agreement that has since been stopped', async () => {
    const mp = fakeMobilePay();
    const shopId = await seedShop();
    const { session } = await startPaid(mp, shopId);
    mp.agreements.set(session.agreementId, 'STOPPED');

    await performMobilePayWebhookEvent(testDb, mp.api, {
      eventType: 'recurring.agreement-activated.v1',
      agreementId: session.agreementId,
    });
    expect((await shopOf(shopId)).plan).toBe('free');
  });

  it('downgrades when the owner stops the agreement in their app', async () => {
    const mp = fakeMobilePay();
    const { shopId, agreementId } = await seedActive(mp, '2026-11-01');

    await performMobilePayWebhookEvent(testDb, mp.api, {
      eventType: 'recurring.agreement-stopped.v1',
      agreementId,
    });
    expect((await shopOf(shopId)).plan).toBe('free');
    expect((await subscriptionOf(shopId))!.status).toBe('stopped');
  });

  it('downgrades and stops the agreement when a month cannot be charged', async () => {
    const mp = fakeMobilePay();
    const { shopId, agreementId } = await seedActive(mp, '2026-11-01');

    await performMobilePayWebhookEvent(testDb, mp.api, {
      eventType: 'recurring.charge-failed.v1',
      agreementId,
      chargeType: 'RECURRING',
    });
    expect((await shopOf(shopId)).plan).toBe('free');
    expect(mp.stopped).toEqual([agreementId]);
  });

  it('ignores an agreement no shop is charged on', async () => {
    const mp = fakeMobilePay();
    const { shopId } = await seedActive(mp, '2026-11-01');

    await performMobilePayWebhookEvent(testDb, mp.api, {
      eventType: 'recurring.agreement-stopped.v1',
      agreementId: 'agr_unknown',
    });
    expect((await shopOf(shopId)).plan).toBe('paid');
  });
});

describe('the monthly charging run', () => {
  const NOW = new Date('2026-10-29T05:00:00Z');
  const run = (mp: ReturnType<typeof fakeMobilePay>) =>
    performChargeMobilePaySubscriptions(testDb, () => mp.api, () => 12500, NOW);

  it('charges a month coming due, once, and moves on to the next', async () => {
    const mp = fakeMobilePay();
    const { shopId, agreementId } = await seedActive(mp, '2026-11-01');

    await run(mp);
    await run(mp);

    expect(mp.charges).toEqual([
      {
        agreementId,
        amount: 12500,
        description: 'Qjume abonnement',
        due: '2026-11-01',
        orderId: `qjume-${shopId}-20261101`,
      },
    ]);
    expect((await subscriptionOf(shopId))!.nextChargeDue).toBe('2026-12-01');
  });

  it('leaves a month that is not yet close', async () => {
    const mp = fakeMobilePay();
    await seedActive(mp, '2026-11-20');
    await run(mp);
    expect(mp.charges).toEqual([]);
  });

  it('charges an overdue month as soon as MobilePay allows', async () => {
    const mp = fakeMobilePay();
    await seedActive(mp, '2026-10-20');
    await run(mp);
    expect(mp.charges[0]!.due).toBe('2026-10-30');
  });

  it('never charges a cancelled subscription', async () => {
    const mp = fakeMobilePay();
    const { shopId } = await seedActive(mp, '2026-11-01');
    await testDb.doc(`subscriptions/${shopId}`).update({ status: 'stopped', nextChargeDue: null });
    await run(mp);
    expect(mp.charges).toEqual([]);
  });

  it('stops charging a shop that is no longer on the paid plan', async () => {
    const mp = fakeMobilePay();
    const { shopId, agreementId } = await seedActive(mp, '2026-11-01');
    await testDb.doc(`shops/${shopId}`).update({ plan: 'free' });

    await run(mp);
    expect(mp.charges).toEqual([]);
    expect(mp.stopped).toEqual([agreementId]);
    expect((await subscriptionOf(shopId))!.status).toBe('stopped');
  });

  it('downgrades when MobilePay refuses because the agreement was stopped', async () => {
    const mp = fakeMobilePay();
    const { shopId, agreementId } = await seedActive(mp, '2026-11-01');
    mp.agreements.set(agreementId, 'STOPPED');
    mp.refuseCharges();

    const result = await run(mp);
    expect(result.stopped).toEqual([shopId]);
    expect((await shopOf(shopId)).plan).toBe('free');
  });

  it('keeps a shop whose charge failed for another reason, for tomorrow', async () => {
    const mp = fakeMobilePay();
    const { shopId } = await seedActive(mp, '2026-11-01');
    mp.refuseCharges();

    const result = await run(mp);
    expect(result.failed).toEqual([shopId]);
    expect((await shopOf(shopId)).plan).toBe('paid');
    expect((await subscriptionOf(shopId))!.nextChargeDue).toBe('2026-11-01');
  });
});

describe('registering the webhook from the admin console', () => {
  const ADMIN = { uid: 'admin-uid', email: 'admin@qjume.dk' };
  const URL_ = 'https://us-central1-qjume.cloudfunctions.net/mobilepayWebhook';

  it('registers, hands back the secret once, and logs it without the secret', async () => {
    const mp = fakeMobilePay();
    const result = await performRegisterMobilePayWebhook(testDb, ADMIN, mp.api, URL_, 'test');

    expect(result).toMatchObject({ url: URL_, environment: 'test', replaced: 0 });
    expect(result.secret).toBeTruthy();
    const log = (await testDb.collection('adminAuditLog').get()).docs.map((d) => d.data());
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ action: 'billing.registerWebhook', shopId: '' });
    expect(JSON.stringify(log[0])).not.toContain(result.secret);
  });

  it('replaces an earlier registration for the same URL, and leaves others', async () => {
    const mp = fakeMobilePay();
    mp.webhooks.push({ id: 'wh_old', url: URL_ }, { id: 'wh_other', url: 'https://elsewhere' });

    const result = await performRegisterMobilePayWebhook(testDb, ADMIN, mp.api, URL_, 'test');

    expect(result.replaced).toBe(1);
    expect(mp.webhooks.map((w) => w.id).sort()).toEqual([result.webhookId, 'wh_other'].sort());
  });

  it('refuses without a configured webhook URL', async () => {
    const mp = fakeMobilePay();
    await expect(
      performRegisterMobilePayWebhook(testDb, ADMIN, mp.api, undefined, 'test'),
    ).rejects.toThrow(/MOBILEPAY_WEBHOOK_URL/);
    expect(mp.webhooks).toEqual([]);
  });
});
