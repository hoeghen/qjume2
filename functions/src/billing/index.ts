import type { PaymentProvider } from './provider.js';
import { stubPayments } from './stub.js';
import { stripeProvider } from './stripe.js';
import { isMobilePaySession, mobilepayProvider } from './mobilepay.js';

export type {
  CheckoutSession,
  CompletedCheckout,
  PaymentProvider,
} from './provider.js';
export { stubPayments } from './stub.js';
export { stripeProvider } from './stripe.js';
export { mobilepayProvider } from './mobilepay.js';

/**
 * Selects a payment provider from configuration.
 *
 * A deployed function with none configured refuses rather than falling back to
 * the stub: quietly granting paid plans for free is a worse failure than an
 * upgrade button that returns an error.
 */
export function providerFromEnv(env = process.env): PaymentProvider {
  const name = env['PAYMENTS_PROVIDER'];

  if (name === 'stub') return stubPayments(env['PAYMENTS_STUB_SECRET']);
  if (name === 'stripe') return stripeProvider(env);
  if (name === 'mobilepay') return mobilepayProvider(env);
  if (name) throw new Error(`Unknown PAYMENTS_PROVIDER: ${name}`);

  if (env['FIRESTORE_EMULATOR_HOST']) return stubPayments();
  throw new Error(
    'PAYMENTS_PROVIDER is not configured, so no plan change can be verified.',
  );
}

/**
 * The provider a returning session belongs to.
 *
 * Not simply the configured one: `PAYMENTS_PROVIDER` picks where *new*
 * checkouts go, and switching it must not strand a checkout already started
 * with the other. A MobilePay session says so in its id; anything else is
 * the configured provider's, as before.
 */
export function providerForSession(sessionId: string, env = process.env): PaymentProvider {
  return isMobilePaySession(sessionId) ? mobilepayProvider(env) : providerFromEnv(env);
}
