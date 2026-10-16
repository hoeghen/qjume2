import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { danishVatRate, type TaxRateApi } from './stripe.js';

function fakeStripe(existing: Partial<Stripe.TaxRate>[]) {
  const created: Stripe.TaxRateCreateParams[] = [];
  const api: TaxRateApi = {
    taxRates: {
      async list() {
        return { data: existing as Stripe.TaxRate[] };
      },
      async create(params) {
        created.push(params);
        return { id: 'txr_new' } as Stripe.TaxRate;
      },
    },
  };
  return { api, created };
}

describe('Danish VAT on Stripe checkouts', () => {
  it('reuses an existing exclusive 25 % DK rate', async () => {
    const { api, created } = fakeStripe([
      { id: 'txr_inclusive', percentage: 25, inclusive: true, country: 'DK' },
      { id: 'txr_se', percentage: 25, inclusive: false, country: 'SE' },
      { id: 'txr_dk', percentage: 25, inclusive: false, country: 'DK' },
    ]);
    expect(await danishVatRate(api)).toBe('txr_dk');
    expect(created).toEqual([]);
  });

  it('creates one, added on top of the price, when none exists', async () => {
    const { api, created } = fakeStripe([]);
    expect(await danishVatRate(api)).toBe('txr_new');
    expect(created).toEqual([
      expect.objectContaining({ percentage: 25, inclusive: false, country: 'DK', tax_type: 'vat' }),
    ]);
  });

  it('uses a pinned rate without asking Stripe', async () => {
    const { api, created } = fakeStripe([]);
    expect(await danishVatRate(api, 'txr_pinned')).toBe('txr_pinned');
    expect(created).toEqual([]);
  });
});
