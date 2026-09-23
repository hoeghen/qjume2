# Services in use — real backend (qjume-d483a)

Tracking which third-party/Google services the real (non-mock) deployment
depends on, and the account each is registered under. All of them use the
same Google account (`carverdk@gmail.com`) as the sign-in identity — noted
per service below so access/recovery isn't a guessing game later.

| Service | Used for | Account |
|---|---|---|
| Firebase / Google Cloud (`qjume-d483a`) | Firestore, Realtime Database (presence only), Auth, Cloud Functions, Hosting, Secret Manager | Google email — `carverdk@gmail.com` |
| OpenCage | Geocoding for discovery/geohash queries | Google email — `carverdk@gmail.com` |
| Resend | Transactional email (queue notifications), sending domain `bitwork.dk` (verified) | Google email — `carverdk@gmail.com` |
| Stripe | Subscription billing for the paid plan | Google email — `carverdk@gmail.com` |
| GitHub (`hoeghen/qjume2`) | Source control, CI/CD (`deploy.yml` for the mock build on GitHub Pages, `deploy-firebase.yml` for the real backend) | Google email — `carverdk@gmail.com` |

## Not in use

- **Google Play Billing** — considered and rejected in favour of Stripe. Play
  Billing only works from a native/TWA Android app distributed via the Play
  Store; it doesn't reach the PWA on iOS or desktop, where `/shop/billing` is
  actually used today. See CLAUDE.md decision 10 for the Stripe rationale.

## Still pending

- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` — blocks
  deploying `startCheckout`, `completeCheckout`, `stripeWebhook`.
