# Qjume — build plan

Ordered so that each phase produces something testable. Do not start a phase until the
previous one runs.

---

## Phase 0 — Foundation

- Vite + React + TypeScript project, strict mode
- Firebase project, Emulator Suite configured for Firestore, Auth, Functions, RTDB
- PWA manifest with `display: standalone`, service worker registered
- Shared types in `src/types/` for Shop, Queue, Ticket, Station
- Basic routing: `/`, `/shop`, `/monitor`

**Done when:** app installs to home screen on iOS and Android, emulators run locally.

---

## Phase 1 — Queue mechanics (no auth, no maps, no notifications)

The heart of the product. Build and prove this before anything else.

- Firestore schema per PRD section 9.2
- Cloud Function: `joinQueue` — issues a ticket, assigns position
- Cloud Function: `callNext` — **transactional**; resolves current ticket, applies no-show
  penalty, assigns next ticket to a station
- Cloud Function: `leaveQueue`, `removeTicket`
- No-show penalties: back / back 3 / back 5; removal at 3 strikes
- Security rules enforcing server-only state transitions

**Done when:** a test suite proves that two concurrent `callNext` calls against one queue
assign two different tickets, and that a client cannot write ticket state directly.

---

## Phase 2 — Shop mode UI

- Shop sign-up: email code, Google, Apple (Firebase Auth)
- Create/edit queue: name, address, category, max size, avg service time, penalty, hours
- Serving screen: station picker, Next button, current pairing, upcoming list
- Pause — with prominent, unmissable pause state
- Close: runtime choice between drain mode and hard close
- Manual walk-in add
- Manual re-link of a ticket by display name

**Done when:** a shop can run a full queue end to end on a tablet.

---

## Phase 3 — Customer discovery

- Geocode owner-entered address at save time; store `lat`, `lng`, `geohash`
- List view: light cards, shop name and address only
- Map view with radius
- Shared filter state across both views: radius, category, status
- Sort by distance, name, wait time
- Free text search across name, address, queue name, description
- Queue detail view with live waiting count and estimate

**Done when:** a customer can find a queue by location and category and see accurate
waiting numbers.

---

## Phase 4 — Customer join and live state

- Anonymous join with display name
- Resume code: generated, shown, one-tap prompt to save or add email
- Rejoin by resume code on another device
- Magic-link email sign-in as optional upgrade
- Live position and estimated wait via Firestore listeners
- Leave queue
- QR code join at counter
- Wait time refinement from observed service times (PRD 9.5)

**Done when:** a customer can join remotely, watch their position move in real time, and
reclaim their ticket on a second device.

---

## Phase 5 — Notifications

- FCM web push, service worker handler
- iOS install-prompt flow: detect `display-mode: standalone`, guide to Add to Home Screen,
  gesture-triggered permission prompt
- Milestone dispatch at 15/10/5/1 min, recalculated on each advance, deduplicated per ticket
- Bumped / removed / queue-closed notifications
- Email fallback

**Done when:** milestones fire correctly on Android and on an installed iOS PWA, and the
email path works for a customer who denied push.

---

## Phase 6 — Offline resilience

- RTDB heartbeat from shop device; Cloud Function mirrors to Firestore
- Queue flips to `unavailable` on heartbeat loss — no new joiners, stays open
- Shop device serves from cached queue, syncs on reconnect
- Customer-facing stale-data warning while shop is offline

**Done when:** pulling the network on the shop device leaves it able to serve, and
reconnecting reconciles cleanly.

---

## Phase 7 — Tiers and paid features

- Plan field on shop; server-side enforcement of free limits (1 queue, ~20 waiting, 1 server)
- Payment integration
- Paid: multiple queues, parallel stations, staff roles, analytics, branding, shop profile,
  queue description, join message, SMS

**Done when:** a free shop cannot exceed its limits by any client-side manipulation.

---

## Open questions to resolve before the phase that needs them

- **Phase 3:** geocoding provider and caching strategy; map library
- **Phase 4:** resume code format and collision scope
- **Phase 6:** timeout behaviour if a shop never reconnects
- **Phase 7:** payment provider
