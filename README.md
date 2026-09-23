# Qjume

A queueing app: shops run remote/in-person queues, customers join and track their
position, staff call the next customer. See `docs/qjume-prd.md` for the full product
spec and `CLAUDE.md` for conventions and the decisions made during implementation.

## Stack

- React (Vite), TypeScript, PWA
- Firebase: Firestore, Auth, Cloud Functions, Cloud Messaging, Hosting
- Realtime Database — shop heartbeat/presence only
- `geofire-common` for geohash queries

Two backends share one app: Firebase for the real deployment, and a `localStorage`-backed
mock (`src/lib/mock/`) with the same surface, used for the GitHub Pages build and local
development without the emulator suite.

## Services in use — real backend (`qjume-d483a`)

All registered under the same Google account (`carverdk@gmail.com`) as the sign-in
identity — noted per service so access/recovery isn't a guessing game later.

| Service | Used for | Account |
|---|---|---|
| Firebase / Google Cloud (`qjume-d483a`) | Firestore, Realtime Database (presence only), Auth, Cloud Functions, Hosting, Secret Manager | Google email — `carverdk@gmail.com` |
| OpenCage | Geocoding for discovery/geohash queries | Google email — `carverdk@gmail.com` |
| Resend | Transactional email (queue notifications), sending domain `bitwork.dk` (verified) | Google email — `carverdk@gmail.com` |
| Stripe | Subscription billing for the paid plan | Google email — `carverdk@gmail.com` |
| GitHub (`hoeghen/qjume2`) | Source control, CI/CD (`deploy.yml` for the mock build on GitHub Pages, `deploy-firebase.yml` for the real backend) | Google email — `carverdk@gmail.com` |

Not in use: **Google Play Billing** — considered and rejected in favour of Stripe, since
Play Billing only works from a native/TWA Android app on the Play Store and wouldn't
reach the PWA on iOS or desktop, where `/shop/billing` is actually used. See CLAUDE.md
decision 10 for the Stripe rationale.

Still pending: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` — blocks
deploying `startCheckout`, `completeCheckout`, `stripeWebhook`.
