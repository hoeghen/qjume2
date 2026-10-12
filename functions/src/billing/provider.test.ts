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

  it('selects MobilePay, and refuses it without its keys or price', () => {
    const env = {
      PAYMENTS_PROVIDER: 'mobilepay',
      MOBILEPAY_CLIENT_ID: 'id',
      MOBILEPAY_CLIENT_SECRET: 'secret',
      MOBILEPAY_SUBSCRIPTION_KEY: 'key',
      MOBILEPAY_MSN: '123456',
      MOBILEPAY_PRICE_ORE: '12500',
    };
    expect(providerFromEnv(env).name).toBe('mobilepay');
    expect(() => providerFromEnv({ ...env, MOBILEPAY_PRICE_ORE: '' })).toThrow(
      /MOBILEPAY_PRICE_ORE/,
    );
    expect(() => providerFromEnv({ ...env, MOBILEPAY_MSN: '' })).toThrow(/MOBILEPAY_MSN/);
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
