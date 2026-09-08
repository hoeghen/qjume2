# Qjume — Product Requirements Document

**Version:** 1.0 (initial spec, for implementation handoff)
**Status:** Product decisions confirmed. Architecture proposed, not yet reviewed in detail.

---

## 1. Overview

Qjume ("queue me") is a progressive web app for joining and running queues. It has two modes:

- **Customer mode** — find queues nearby, join remotely, get notified as your turn approaches.
- **Shop mode** — create and run queues, call the next person, manage no-shows.

The scope is any queue anywhere, not just retail shops: clinics, council offices, banks, workshops, events. Throughout this document "shop" means any organisation running a queue.

The core value proposition is that a customer can see how long a queue is *before* deciding to go, join without being physically present, and be told when to start heading over.

---

## 2. Glossary

| Term | Meaning |
|---|---|
| **Shop** | An organisation that runs one or more queues. |
| **Queue** | A single ordered line of waiting customers, with its own address, category and settings. |
| **Ticket** | One customer's place in one queue. |
| **Station** | A serving position within a queue (e.g. "Till 2"), used when multiple staff serve in parallel. |
| **Drain mode** | Queue stops accepting new joiners but continues serving those already waiting. |
| **Resume code** | Short code that lets an anonymous customer reclaim their ticket on another device. |

---

## 3. User roles

1. **Customer** — anonymous by default. May optionally upgrade to an identified account.
2. **Shop owner** — creates the shop, owns billing, full settings access.
3. **Staff member** — can serve a queue but cannot change settings or see billing. *(Paid feature.)*

---

## 4. Customer mode

### 4.1 Discovery

Two views over the same result set, toggleable:

- **List view** — light cards showing **shop name and address only**. Full detail on tap-through. Sortable by distance, name, or wait time.
- **Map view** — pins within the selected radius.

**Shared filter state.** Distance/radius is a single setting adjustable from either view; changing it in one view changes it in the other. Same for category and status filters.

Filters:
- **Distance / radius** (customer-set)
- **Category** (see 4.2)
- **Status** — active, inactive, closing soon
- **Free text search** — matches shop name, address, queue name, and queue description

### 4.2 Categories

Fixed list of eleven:

1. Food and drink
2. Health and medical
3. Government and public services
4. Banking and finance
5. Retail and shopping
6. Personal care
7. Automotive
8. Education
9. Transport and travel
10. Events and attractions
11. Other

### 4.3 Queue detail view

Before joining, the customer sees:
- Queue name and description
- Number of people currently waiting
- Estimated wait time
- Address, with view-on-map
- Number of other queues at the same shop
- Current status (open / drain mode / paused / temporarily unavailable / closed)

### 4.4 Joining

- Customer picks a **display name** — used by staff when calling them ("Marta, Till 2").
- Join is **anonymous by default**, no login required.
- Customer may optionally supply **email** and/or **phone number** for notification fallback.
- On joining, the customer is shown a **resume code** and prompted once — one tap to dismiss — to either save the code or add an email so it can be sent to them.
- Joining is possible **remotely**; the customer does not need to be near the queue.
- Walk-ins scan a **QR code at the counter**, which drops them into the same queue on their own phone. No preferential treatment for walk-ins versus remote joiners — one queue, one order.
- For customers without a smartphone, the owner can **add a walk-in manually**. That person receives a spoken or written ticket number and follows the in-shop monitor instead of notifications.

### 4.5 Multiple queues

- **Across different shops:** always allowed.
- **Within one shop:** the owner decides per shop whether their queues are mutually exclusive (parallel tills serving the same thing — pick one) or joinable together (different services — join both).

The app does not attempt to resolve two turns arriving simultaneously; that is left to the customer.

### 4.6 While waiting

- Live position and estimated wait, updated in real time.
- **Milestone notifications** at 15, 10, 5 and 1 minute before the estimated turn.
- **"You've been bumped"** notification if the owner marks them a no-show.
- Customer can **leave the queue** at any time.

### 4.7 History

Customers have a history of queues they have joined, doubling as a favourites list for quick rejoining.

### 4.8 Losing a device

- **With a resume code or email:** enter the code, or use a magic link, on any device to reclaim the ticket.
- **Without either:** ask the shop to re-link the ticket manually by display name. This is an accepted consequence of the customer declining to save a code; the shop-side re-link is the safety net.

---

## 5. Shop mode

### 5.1 Sign-up

Open sign-up, **no business verification**. Three login methods:

1. Email with a code sent back
2. Google Sign-In
3. Apple Sign In

> **Note:** Apple Sign In is included partly because Apple's App Store Review Guidelines require it as an option for apps offering third-party sign-in. Including it now avoids rework if a native wrapper is ever shipped.

### 5.2 Creating a queue

Owner sets:
- Queue name
- **Fixed address** (not device location) — geocoded to lat/lng for map and distance
- Category
- Maximum queue size
- Average service time per customer (seed value for wait estimates)
- No-show penalty (see 5.4)
- Opening hours for scheduled auto-close
- Description *(paid)*
- Join message sent to customers on joining *(paid)*
- Whether this shop's queues are mutually exclusive (see 4.5)

### 5.3 Serving

- The queue advances **manually** — a staff member taps **Next**. There is no timer-based auto-advance.
- The Next tap is the **source of truth** for both serving and no-shows.
- **Stations:** each staff member picks a station identity when they start a shift (e.g. "Till 1", "Till 2", or their own name). Tapping Next **atomically** assigns the next waiting customer to that station, so simultaneous taps by different staff cannot collide or double-assign. The assignment is displayed as a pairing: *"Marta — Till 2"*.
- Free tier is one server at a time; **parallel stations are a paid feature**.

### 5.4 No-shows

If the called customer is not present, the owner taps Next again, which marks them a no-show. The penalty is **owner-configurable per queue**:

- Move to the back of the queue, **or**
- Move back 3 places, **or**
- Move back 5 places

After **three** no-shows the customer is removed from the queue entirely. This is deliberate — it gives customers an incentive to actually be there.

The owner can also **remove any customer from the queue outright**.

### 5.5 Pause

The owner can pause a queue mid-service (a break, a rush). **Pause state must be prominently visible** in the shop UI so it is not forgotten.

### 5.6 Closing

Manual open/close, plus **scheduled automatic close** from opening hours.

When closing with people still waiting, the owner **chooses at runtime** between:

- **Drain mode** — stop new joiners, finish serving everyone already in the queue.
- **Hard close** — clear the queue, sending waiting customers a "queue closed, visit us next time" notification.

### 5.7 In-shop monitor

An optional display mode showing the queue to everyone in the shop:
- "Now serving" panel with all active station pairings
- The next few customers waiting

This is the primary channel for manually-added walk-ins who have no phone.

### 5.8 Devices

- Customers: mobile
- Staff: mobile or tablet
- Optional: a monitor/large display in shop mode

---

## 6. Offline handling

This matters because a till going offline must not silently break the queue.

- The shop device sends a **heartbeat**.
- If the heartbeat drops, the server marks the queue **"temporarily unavailable"** — it stays open, but **no new customers can join**.
- The shop device **continues serving from a cached copy** of the queue, and **syncs on reconnect**.
- Last-write-wins on reconnect for conflicting state.

> **Known gap to communicate in UI:** customers already in the queue will see stale position and wait estimates while the shop is offline. The customer-facing status should say so explicitly rather than showing a confidently wrong number.

**Implementation note.** Firestore does not natively support presence. The documented workaround is to use Realtime Database to report connection status and a Cloud Function to mirror that data into Firestore. Realtime Database's `onDisconnect()` and the `.info/connected` path are the mechanism. Docs: https://firebase.google.com/docs/firestore/solutions/presence

---

## 7. Notifications

Three channels, in order of preference:

1. **Web push** — with vibration where the platform allows it
2. **Email** — if the customer supplied one
3. **SMS** — *(paid feature)*

### 7.1 iOS constraint — important

Web push on iOS has a hard requirement that shapes onboarding. iOS 16.4 and later support push notifications for PWAs that have been added to the Home Screen; the user must install the PWA through Safari's "Add to Home Screen" option first, and push does not work from Safari tabs. A web app manifest with the correct display setting is required, and users must initiate an action before being prompted for push permission.

Consequences for implementation:

- The manifest must set `display: standalone`.
- iOS users must be guided through Add to Home Screen **before** the notification prompt is meaningful. Detect with `window.matchMedia('(display-mode: standalone)').matches` and show an install prompt if false.
- The permission prompt must be triggered by a user gesture (a visible "Enable notifications" button), not automatically on load.
- **Email fallback is not optional on iOS.** Assume a meaningful share of iOS customers will never grant push, and make sure the in-app live view plus email covers them.
- Some developers report reliability issues where iOS web push works initially then stops unexpectedly, so delivery rates should be monitored and fallbacks kept in place.

Reference: https://firebase.google.com/docs/cloud-messaging/js/client

### 7.2 SMS

SMS requires a third-party provider (Twilio or similar) and carries a real per-message cost. This is why it is a paid feature.

---

## 8. Pricing tiers

### Free

- One active queue
- Basic Next-button management
- Cap of ~20 waiting customers
- One server at a time

### Paid

- Multiple queues
- **Multiple parallel staff / stations**
- **Staff roles** with limited access (serve only; no settings, no billing)
- **Analytics** — wait times, peak hours, people served (nothing in free tier)
- **Custom branding**
- **Shop profile page** — logo, opening hours, phone, description
- **Queue description**
- **Join message** to customers
- **SMS notifications**
- **Appointment slots** alongside walk-ins

---

## 9. Technical architecture

> This section is a proposal based on the stated stack preference (Google backend, React). It has not been reviewed line by line — treat the data model as a starting point, not a fixed contract.

### 9.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React (PWA) | Stated preference. |
| Hosting | Firebase Hosting | Stated preference for Google backend. |
| Database | **Cloud Firestore** | Real-time listeners map directly onto live queue position updates. |
| Presence | **Realtime Database** | Only for shop heartbeat — Firestore has no native presence. |
| Auth | Firebase Auth | Covers email link, Google, and Apple out of the box. |
| Push | Firebase Cloud Messaging | Web push. |
| Server logic | Cloud Functions | Atomic Next, wait-time recalculation, notification dispatch, scheduled close. |
| SMS | Twilio (or similar), via Cloud Functions | Paid tier only. |

### 9.2 Firestore data model

```
shops/{shopId}
  name, ownerUid, plan, exclusiveQueues (bool)
  profile: { logo, hours, phone, description }   // paid

shops/{shopId}/queues/{queueId}
  name, description, category, maxSize
  address, lat, lng, geohash
  avgServiceTimeSeconds        // seeded by owner, refined from data
  noShowPenalty                // "back" | "back3" | "back5"
  status                       // open | drainMode | paused | unavailable | closed
  schedule: { opensAt, closesAt, days[] }
  currentNumber, lastIssuedNumber
  waitingCount                 // denormalised for list/map queries

shops/{shopId}/queues/{queueId}/tickets/{ticketId}
  displayName, number, position
  state                        // waiting | serving | served | noShow | removed | left
  noShowCount                  // removal at 3
  station                      // set on assignment
  joinedAt, calledAt
  customerUid | anonymousId
  resumeCodeHash
  email, phone                 // optional
  fcmTokens[]

shops/{shopId}/queues/{queueId}/stations/{stationId}
  label, activeStaffUid, currentTicketId

customers/{uid}
  history[]                    // queue refs, for rejoin and favourites
```

### 9.3 Geo queries

Firestore has no native radius query. The documented approach is to store a geohash on each document and query by position using geohash range queries with a single indexed field. Firebase publishes the `geofire-common` helper library for the web (`npm install --save geofire-common`) to handle geohash generation and query bounds.

Pattern:
1. `geohashQueryBounds(center, radiusInM)` returns up to 9 startAt/endAt pairs (usually 4).
2. Issue one query per bound, ordered by `geohash`.
3. Merge results and filter out false positives with `distanceBetween()`.

Docs: https://firebase.google.com/docs/firestore/solutions/geoqueries

Store `geohash`, `lat`, `lng` on the **queue** document, derived by geocoding the owner-entered address at save time.

### 9.4 Atomic Next

The core correctness requirement. Implement as a **Firestore transaction** (or a Cloud Function using one) that, in a single atomic step:

1. Reads the current serving ticket for the station, if any.
2. Resolves it — served, or no-show with the configured penalty applied.
3. Increments `noShowCount` and removes the ticket if it reaches 3.
4. Selects the next `waiting` ticket by position.
5. Writes `state: serving` and `station` onto it.

Because the read-modify-write is transactional, two staff tapping Next simultaneously get two different customers. **No client-side debounce or artificial delay is needed.**

Docs: https://firebase.google.com/docs/firestore/manage-data/transactions

### 9.5 Wait time estimation

- Seed from the owner's `avgServiceTimeSeconds`.
- Refine continuously from observed `calledAt` deltas on served tickets — a rolling average over recent completions, per queue.
- Estimated wait for position *n* = `n × currentAvgServiceTime ÷ activeStationCount`.
- Recalculate on every Next; write to the queue doc so listeners pick it up.

### 9.6 Notification scheduling

Milestone alerts (15/10/5/1 min) cannot be scheduled at join time because the estimate moves. Recalculate on each queue advance and dispatch any milestone crossed since the last advance. Track dispatched milestones on the ticket to avoid duplicates.

### 9.7 Security rules

- Customers may read open queues and write only their own ticket.
- Ticket state transitions (`serving`, `served`, `noShow`) must be **server-only** — enforced through Cloud Functions, never client writes. A customer must not be able to advance themselves.
- Staff writes scoped to their shop; settings and billing scoped to the owner uid.

---

## 10. Deferred to v2

- **Distance-aware notification timing** — nudge customers earlier if they are far from the queue. The app already has location and a fixed queue address, so this is tractable, just not v1.
- Appointment slots alongside walk-ins (listed as paid, but likely post-v1 in practice).

---

## 11. Explicitly out of scope

These were considered and rejected, and should not be re-introduced without discussion:

- **Ratings or reviews on shops.** Not what the app is for.
- **Timer-based automatic queue advance.** Manual Next only.
- **Showing customer distance or on-site status to the shop.** Shop sees display name and position only.
- **Separate queues for walk-ins versus remote joiners.** One queue, one order.
- **Business verification at shop sign-up.**
- **Forced login for customers.**

---

## 12. Open questions for implementation

1. Geocoding provider for owner-entered addresses — Google Geocoding API is the natural fit alongside the rest of the stack, but it is billed per request and needs caching.
2. Map rendering library — Google Maps JS API, or a lighter alternative such as MapLibre.
3. Resume code format and collision handling — proposed: 6 characters, alphanumeric, scoped per queue rather than globally unique.
4. What happens to a ticket if the shop never comes back online — is there a timeout after which waiting customers are notified?
5. Payment provider for the paid tier (Stripe assumed, not decided).
