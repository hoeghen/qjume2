import { beforeEach, describe, expect, it } from 'vitest';
import { performCreateBillingPortalSession } from './checkout.js';
import { stubPayments } from './stub.js';
import type { PaymentProvider } from './provider.js';
import { OWNER_UID, clearFirestore, makeShop, testDb } from '../test/harness.js';

beforeEach(clearFirestore);

async function seedShop(): Promise<string> {
  const ref = testDb.collection('shops').doc();
  await ref.set(makeShop());
  return ref.id;
}

function fakePortal(url: string | null): PaymentProvider {
  return {
    name: 'fake',
    createCheckout: () => Promise.reject(new Error('not used')),
    verifyCheckout: () => Promise.reject(new Error('not used')),
    createPortalSession: () => Promise.resolve(url ? { url } : null),
  };
}

describe('the billing portal link', () => {
  it('hands back whatever url the provider gives for this shop', async () => {
    const shopId = await seedShop();
    const result = await performCreateBillingPortalSession(
      testDb,
      OWNER_UID,
      { shopId },
      fakePortal('https://billing.stripe.com/session/test_123'),
    );
    expect(result).toEqual({ url: 'https://billing.stripe.com/session/test_123' });
  });

  it('refuses a shop the provider has nothing to show yet', async () => {
    const shopId = await seedShop();
    await expect(
      performCreateBillingPortalSession(testDb, OWNER_UID, { shopId }, fakePortal(null)),
    ).rejects.toThrow(/no billing history/i);
  });

  it('refuses a provider with no portal at all', async () => {
    const shopId = await seedShop();
    await expect(
      performCreateBillingPortalSession(testDb, OWNER_UID, { shopId }, stubPayments()),
    ).rejects.toThrow(/no billing history/i);
  });

  it('refuses anyone but the shop owner', async () => {
    const shopId = await seedShop();
    await expect(
      performCreateBillingPortalSession(
        testDb,
        'someone-else',
        { shopId },
        fakePortal('https://billing.stripe.com/session/test_123'),
      ),
    ).rejects.toThrow(/owner/i);
  });
});
