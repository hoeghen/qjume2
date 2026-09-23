import { describe, expect, it } from 'vitest';
import { providerFromEnv } from './index.js';

describe('payment provider selection', () => {
  it('uses the named provider', () => {
    expect(providerFromEnv({ PAYMENTS_PROVIDER: 'stub' }).name).toBe('stub');
    expect(
      providerFromEnv({
        PAYMENTS_PROVIDER: 'stripe',
        STRIPE_SECRET_KEY: 'sk_test_x',
        STRIPE_PRICE_ID: 'price_x',
      }).name,
    ).toBe('stripe');
  });

  it('refuses stripe without its keys', () => {
    expect(() =>
      providerFromEnv({ PAYMENTS_PROVIDER: 'stripe' }),
    ).toThrow(/STRIPE_SECRET_KEY/);
    expect(() =>
      providerFromEnv({
        PAYMENTS_PROVIDER: 'stripe',
        STRIPE_SECRET_KEY: 'sk_test_x',
      }),
    ).toThrow(/STRIPE_PRICE_ID/);
  });

  it('rejects an unknown provider rather than guessing', () => {
    expect(() => providerFromEnv({ PAYMENTS_PROVIDER: 'wat' })).toThrow(
      /Unknown/,
    );
  });

  it('falls back to the stub only under the emulator', () => {
    expect(
      providerFromEnv({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }).name,
    ).toBe('stub');
  });

  it('refuses to leave a deployed function unable to verify a payment', () => {
    expect(() => providerFromEnv({})).toThrow(/not configured/);
  });
});
