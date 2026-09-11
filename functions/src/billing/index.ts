import type { PaymentProvider } from './provider.js';
import { stubPayments } from './stub.js';

export type {
  CheckoutSession,
  CompletedCheckout,
  PaymentProvider,
} from './provider.js';
export { stubPayments } from './stub.js';

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
  if (name) throw new Error(`Unknown PAYMENTS_PROVIDER: ${name}`);

  if (env['FIRESTORE_EMULATOR_HOST']) return stubPayments();
  throw new Error(
    'PAYMENTS_PROVIDER is not configured, so no plan change can be verified.',
  );
}
