/**
 * Which Secret Manager secrets a function needs, grouped by what they're for.
 *
 * Firebase Functions v2 does not put a Secret Manager secret into
 * `process.env` just because it exists — each function that reads one must
 * list it in its own `secrets` option, or the value is simply absent at
 * runtime despite `firebase functions:secrets:set` having stored it. These
 * arrays are the one place that list is written, so every function needing
 * (say) Stripe's key names it the same way. See CLAUDE.md decision 10.
 */
export const GEOCODING_SECRETS = ['GEOCODING_API_KEY'];
export const EMAIL_SECRETS = ['EMAIL_API_KEY'];
export const STRIPE_SECRETS = ['STRIPE_SECRET_KEY'];
export const STRIPE_WEBHOOK_SECRETS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];

/**
 * Firebase validates every bound secret's existence in Secret Manager at
 * deploy time, for every function, whether or not that function's code path
 * will run today. That means the Stripe callables can't declare
 * `STRIPE_SECRETS` unconditionally without Stripe's real secrets already
 * existing — which blocks deploying everything else while payments are still
 * on the stub provider (`PAYMENTS_PROVIDER=stub`, CLAUDE.md decision 10).
 * These read `process.env` at deploy-time analysis (firebase-tools loads
 * `.env.<project>` before requiring this code), so switching the provider
 * back to `stripe` and setting the real secrets is what re-enables them.
 */
const stripeSelected = process.env['PAYMENTS_PROVIDER'] === 'stripe';
export const STRIPE_SECRETS_IF_ENABLED = stripeSelected ? STRIPE_SECRETS : [];
export const STRIPE_WEBHOOK_SECRETS_IF_ENABLED = stripeSelected
  ? STRIPE_WEBHOOK_SECRETS
  : [];
