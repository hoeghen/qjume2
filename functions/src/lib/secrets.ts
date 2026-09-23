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
