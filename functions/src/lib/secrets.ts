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
export const MOBILEPAY_SECRETS = [
  'MOBILEPAY_CLIENT_ID',
  'MOBILEPAY_CLIENT_SECRET',
  'MOBILEPAY_SUBSCRIPTION_KEY',
];
export const MOBILEPAY_WEBHOOK_SECRETS = [...MOBILEPAY_SECRETS, 'MOBILEPAY_WEBHOOK_SECRET'];

/**
 * Which providers' secrets are bound. A constant in code, deliberately — not
 * read from `.env`.
 *
 * Firebase validates every bound secret's existence in Secret Manager at
 * deploy time, so a provider whose secrets do not exist yet must not be
 * bound, or every deploy fails. That choice was once read from
 * `process.env`, on the belief that firebase-tools loads `.env.<project>`
 * before analysing this code. It does not: discovery runs with only
 * Firebase's own variables (`discoverBuild(runtimeConfig, firebaseEnvs)` in
 * firebase-tools' deploy/functions/prepare.js), so the condition was always
 * false, nothing was bound, and MobilePay's functions ran without their keys
 * despite them being set. `.env` decides runtime behaviour only.
 *
 * To switch a provider on: create its secrets in Secret Manager first, then
 * flip it here.
 */
const STRIPE_SECRETS_EXIST = false;
const MOBILEPAY_SECRETS_EXIST = true;

export const STRIPE_SECRETS_IF_ENABLED = STRIPE_SECRETS_EXIST ? STRIPE_SECRETS : [];
export const STRIPE_WEBHOOK_SECRETS_IF_ENABLED = STRIPE_SECRETS_EXIST
  ? STRIPE_WEBHOOK_SECRETS
  : [];

/**
 * Bound for as long as any shop might be on MobilePay, not only while it
 * takes new checkouts: those shops still need charging every month and
 * cancelling on request after `PAYMENTS_PROVIDER` moves to Stripe. See
 * CLAUDE.md decision 19.
 */
export const MOBILEPAY_SECRETS_IF_ENABLED = MOBILEPAY_SECRETS_EXIST ? MOBILEPAY_SECRETS : [];
export const MOBILEPAY_WEBHOOK_SECRETS_IF_ENABLED = MOBILEPAY_SECRETS_EXIST
  ? MOBILEPAY_WEBHOOK_SECRETS
  : [];

/** For the checkout callables, which may hand off to either provider. */
export const PAYMENT_SECRETS_IF_ENABLED = [
  ...STRIPE_SECRETS_IF_ENABLED,
  ...MOBILEPAY_SECRETS_IF_ENABLED,
];
