# Qjume — project context

Read `docs/qjume-prd.md` for the full product spec. This file covers conventions and the
things that are easy to get wrong.

## Stack

- React (Vite), TypeScript, PWA
- Firebase: Firestore, Auth, Cloud Functions, Cloud Messaging, Hosting
- Realtime Database — **only** for shop heartbeat/presence, nothing else
- `geofire-common` for geohash queries

## Non-negotiable invariants

These are correctness requirements, not preferences.

1. **Ticket state transitions are server-only.** A client must never be able to write
   `serving`, `served`, or `noShow` to a ticket. Enforce in security rules and route all
   transitions through Cloud Functions. A customer advancing themselves is the main abuse
   vector in this app.

2. **"Next" must be transactional.** The read-modify-write that resolves the current
   ticket and assigns the next one runs inside a single Firestore transaction. Two staff
   tapping simultaneously must get two different customers. Do not add a client-side
   debounce or artificial delay to compensate — if you feel the need to, the transaction
   is wrong.

3. **Three no-shows removes a ticket.** Count is per ticket, per queue.

4. **Offline shops stop accepting joiners.** When the heartbeat drops, the queue goes
   `unavailable` — still open, no new tickets. The shop device keeps serving from cache
   and syncs on reconnect.

5. **The free plan's service count is enforced server-side**, not just hidden in the
   UI. `joinQueue` and `addWalkIn` refuse new customers once a free shop has used its
   free services, reading the live shop doc; the counter fields are server-owned in the
   rules like `plan`. See decision 12.

## Decisions that override the PRD

Product decisions taken during implementation. Where these conflict with
`docs/qjume-prd.md`, these win — that file is the original spec as handed over,
kept unedited.

1. **Shop sign-in is a magic link, not an emailed code.** PRD 5.1 says "email
   with a code sent back". Firebase Auth's native email flow is a sign-in link;
   an OTP code would need a custom function and an email provider for no real
   gain. Phase 4 uses the same link flow for customers.

2. **Drain mode still admits walk-ins.** PRD's glossary says drain "stops
   accepting new joiners"; that applies to remote joiners only. Staff can still
   add someone standing at the counter while the shop finishes up —
   `addWalkIn` accepts `open` and `drainMode`, `joinQueue` accepts `open`
   alone. Keep that asymmetry: it is the point of the decision, not an
   oversight.

5. **Discovery is always ordered by distance, closest twenty, and nothing is
   bounded by distance.** `findNearest(centre, limit)` takes a count, not a
   radius. Firestore widens through `SEARCH_RINGS_KM` only while it still
   needs results, because
   `geohashQueryBounds` has to be given *some* radius and one fixed radius
   would be an invisible distance filter. Cut by count, never by distance: a
   count cannot produce an empty list when queues exist. `Filters.radiusKm` is
   `null` by default and is a control in the panel, off until someone sets it.
   There is no sort control; `applyFilters` still supports the other sort keys
   and is still tested, the screen just never asks for them. Name order is the
   fallback for when the browser refuses a position, because then there is no
   distance to order by. **Closed, paused and offline queues are out by
   default** — someone on this screen wants somewhere to join now — and the
   status control brings them back. `drainMode` stays in: it is still open,
   just not to remote joiners.

4. **Discovery rows show the wait and the waiting count.** PRD 4.1 keeps the
   list to shop name and address, with numbers behind the tap-through. The
   design canvas puts them on the row, and the list can already be *sorted* by
   wait — a sort key you cannot see is a poor trade. `DiscoveredQueue` already
   carries both, so this costs no extra read.

6. **The monitor carries a join code, and a scan counts as being in the shop.**
   The screen on the wall is where someone learns the wait, so it is where they
   should be able to join — a large panel beside the live list, stacked under it
   below 860px. The code is the same URL the counter's printed one carries,
   built once by `counterJoinUrl`: `/q/:shop/:queue?join=1&at=counter`. The
   `at=counter` flag is a claim about *place*, not a permission — it says the
   join came from someone standing in the shop, which is the one thing
   `drainMode` still accepts (decision 2 above). `joinQueue` reads it
   server-side; it does not bypass paused, closed, offline, the plan cap or the
   queue's max size, and the panel shows a reason instead of a code whenever
   the queue takes nobody, so a scan never leads to a refusal. The code is
   **static**: anyone can photograph it and join from the car park. That is
   accepted — the cost of jumping the gun is standing in a queue you are not
   at the front of, and a rotating code would break the printed one.

7. **Six categories, not the PRD's eleven.** PRD 4.2 fixes a list of eleven.
   In practice a filter select is worth less the more of it someone has to
   read before picking one, so `government-and-public-services` and
   `banking-and-finance` merged into `government-and-finance`;
   `retail-and-shopping`, `personal-care` and `automotive` into
   `shopping-and-services` (the errand category); and `transport-and-travel`,
   `events-and-attractions` and `education` into `travel-and-leisure`
   (something you go out for). `food-and-drink`, `health-and-medical` and
   `other` are unchanged. `CATEGORY_LABELS` lives once, in
   `src/lib/categories.ts` — it used to be copied into both the discovery
   filter and the shop's queue form, and the two had already drifted once.

8. **The distance filter runs 50 m–50 km in ten steps, on a 1-2-5 scale.**
   50/100/250/500 m, 1/2/5/10/25/50 km — the same progression a ruler or a
   map uses, each step roughly two to two-and-a-half times the last, so ten
   options cover a single building up to a short drive without an awkward
   gap anywhere in between. Hand-labelled in `Filters.tsx` rather than run
   through `formatDistance`, which would round a fixed "1 km" option to
   "1.0 km".

9. **There is a platform admin console, at `/admin`, for one person.** Not in
   the PRD at all — added on request, scoped by an interview rather than
   guessed at. One admin for now, recognised by a `platformAdmin` custom
   claim set once by hand against the Admin SDK (there is no self-serve grant
   path). Full control, not read-only: browse every shop
   and its queues, edit either directly (bypassing the owner check — see
   `applyQueueUpdate` in `functions/src/shop/updateQueue.ts`, shared by the
   owner's own `updateQueue` and the admin's `adminUpdateQueue` so the two
   validate identically), delete a shop outright (`recursiveDelete`, with a
   type-the-name confirm in the UI — the one truly irreversible action here),
   and suspend or reinstate a shop platform-wide. Payments stay
   **view-only**: `adminUpdateShop`'s request type has no `plan` field, full
   stop — a plan still changes only through `completeCheckout`'s verified
   payment.

   **Suspension is not the shop's own open/closed toggle.** `shop.suspended`
   is a separate field the owner cannot write (`keepsServerOwnedShopFields`
   in `firestore.rules` blocks it, the same shape as `plan`), and a suspended
   shop drops out of discovery and refuses joiners *regardless* of what its
   queues' own `status` says — draining, open, mid-service, it doesn't
   matter. What it does not do is stop staff serving whoever is already
   waiting; that is the same shape as invariant 4's offline handling, not a
   harsher one. Discovery needs this denormalised onto the queue as
   `shopSuspended` (mirroring `shopName`), because a collection-group query
   over queues cannot afford a second read per shop to check the parent —
   `joinQueue` does not trust that copy, though, and checks the live `shop`
   doc it already reads in its own transaction, so staleness in the
   denormalised copy can only ever hide a queue a beat too long, never let a
   join through it shouldn't.

   **Every admin action is logged**, to `adminAuditLog` — a collection no
   client can write to and only a platform admin can read. Written by the
   admin Cloud Functions themselves, inside the same transaction as the
   change where one exists, because a write that succeeds and a log entry
   that doesn't (or the reverse) is exactly the gap an audit trail exists to
   close. Kept top-level, not nested under the shop, so deleting a shop can
   never delete the record that it happened.

   `/admin` is reached only by URL, the same as `/monitor` — nothing in the
   app links to it.

10. **There is a real Terms of Service and Privacy Policy**, at `/terms` and
    `/privacy` (`src/routes/legal/`) — a first draft, not lawyer-reviewed,
    written against what the app actually collects (see the `Ticket`/
    `TicketContact` split, `useGeolocation`) rather than generic boilerplate,
    so it can't silently drift from the code. Operator is Bitwork.dk, under
    Danish/EU law, contact `bitwork@gmail.com`. The paid plan is described as
    a recurring subscription, billed until cancelled — that is the actual
    plan (see "Billing" below), not just wording. Linked from the two moments
    someone is actually agreeing to something — shop sign-in and the upgrade
    button — not stapled to every screen.

    **Payments are Stripe, in subscription mode** (`functions/src/billing/
    stripe.ts`), with Google Pay and Apple Pay offered automatically as
    Stripe Checkout payment buttons — neither is a payment processor on its
    own, so neither needed separate integration. `PaymentProvider`'s
    `createCheckout`/`verifyCheckout` shape is unchanged by this; `stubPayments`
    gained a `stripeProvider` sibling, selected by `PAYMENTS_PROVIDER=stripe`.
    `createCheckout(shopId, 'free')` is a cancellation, not a checkout — it
    calls Stripe directly and hands back a session shaped like the stub's
    and a real Checkout's own (`/shop/billing/return?session=...`), so
    `Billing.tsx` needed no new code to follow it into `completeCheckout`.
    `Shop` carries `stripeCustomerId`/`stripeSubscriptionId`, set by
    `performCompleteCheckout` on an upgrade and read back by the cancel path,
    so it knows what to cancel. A subscription's *ongoing* state — a lapsed
    card, a cancellation made from Stripe's own portal — is not something
    checking-on-return can catch, so `stripeWebhook`
    (`functions/src/billing/webhook.ts`, an `onRequest`, not an `onCall` —
    Stripe is not a signed-in Firebase user, and its signature is the only
    authentication this endpoint has) shipped alongside the provider, not as
    a later add-on: `customer.subscription.deleted` and
    `invoice.payment_failed` both downgrade `shop.plan` to `free`.

    **Secret Manager secrets need to be bound per function, or they are not
    there.** Firebase Functions v2 does not put a secret set with `firebase
    functions:secrets:set` into `process.env` just because it exists — every
    function reading one lists it in its own `secrets` option
    (`functions/src/lib/secrets.ts` names the lists once, reused by every
    caller) or the value is silently absent at runtime despite being set.
    This was already a live gap for `GEOCODING_API_KEY`/`EMAIL_API_KEY`
    before Stripe made it obvious — every function that reads a secret is
    bound now. Secrets must exist in the project (`firebase
    functions:secrets:set`) *before* the first deploy that references them,
    or that deploy fails.

    **`.github/workflows/deploy-firebase.yml`** ships the app to Firebase
    Hosting/Functions/rules on every push to `main`. It skips itself cleanly
    (`if: vars.FIREBASE_PROJECT_ID != ''`) until that repo variable and the
    `VITE_FIREBASE_*`/`FIREBASE_SERVICE_ACCOUNT` secrets are set, rather than
    failing on every push in the meantime.

11. **Firebase is the only backend.** The app used to ship with a second,
    complete implementation of the data layer in `src/lib/mock/` — every
    callable reimplemented against `localStorage`, picked at build time by
    `VITE_BACKEND`/`VITE_FIREBASE_API_KEY`, and deployed to GitHub Pages by
    its own workflow (`deploy.yml`). That stopped earning its keep once the
    real backend covered every feature: it was a second copy of the data
    layer to keep in sync, not a safety net. Both the mock and `deploy.yml`
    are gone; `src/lib/firestore/`, `src/lib/functions.ts`, `src/lib/auth.ts`
    and friends talk to Firebase unconditionally now, and local development
    runs against the Firebase Emulator Suite instead (`.env.example`,
    `VITE_USE_EMULATORS`). **`functions/src/billing/stub.ts` is the one
    exception** — it stays, because it is not a UI-layer mock of this app but
    a `PaymentProvider` the emulator tests exercise instead of hitting Stripe,
    selected by `PAYMENTS_PROVIDER` the same way `stripeProvider` is.

12. **The free plan is the whole app, for 1000 services; then a 100 kr/month
    subscription.** It used to be a set of feature limits (one queue, ~20
    waiting, one till, no staff); those are all gone — several queues, tills,
    staff and descriptions work on every plan. What the free plan limits is
    a count: every shop starts with `FREE_SERVICES_DEFAULT` (1000) free
    services, a service being one customer marked *served* (no-shows do not
    count). The subscription is `SUBSCRIPTION_PRICE_DKK` (100) kr a month
    **excluding VAT**, and removes the limit; losing it brings the remaining
    count back into force.

    - `Shop.freeServicesGranted` / `Shop.servicesUsed` are optional on the
      type (shops predating the counter have neither) — always read them
      through `src/lib/freeServices.ts`, which both app and functions use, so
      the number on screen is the number enforced.
    - `callNext` increments `servicesUsed` inside its own transaction.
    - At 0 on the free plan, **new customers stop, serving does not**:
      `joinQueue` (counter scans included) and `addWalkIn` refuse with
      `free-services-used-up`, while staff go on calling everyone already
      waiting — the same shape as invariant 4, deliberately not blocking
      "Next" and stranding people mid-day.
    - `Queue.shopOutOfFreeServices` is a discovery copy, exactly like
      `shopSuspended`, kept in step by `syncFreeServicesFlag` after the last
      free service, an admin grant, and any plan change. Discovery hides
      those queues; `joinQueue` never trusts the copy.
    - A platform admin can give a shop extra free services
      (`adminGrantFreeServices`, logged to `adminAuditLog` in the same
      transaction). It is a gift, not a payment: `plan` never changes there.
    - The counter shows on the serve screen (owner gets a subscribe link),
      the billing page and both admin pages — never on the monitor.
    - **No App Store or Play billing, by design.** Qjume is a website/PWA,
      so Apple's and Google's in-app cuts do not apply; Apple Pay and Google
      Pay arrive as ordinary Stripe Checkout payment methods. Wrapping it as
      a store app would change that — don't, without deciding to pay it.
      Payments still run on the stub provider (`PAYMENTS_PROVIDER=stub`)
      until real Stripe keys are set.

13. **Notifications count people, not minutes.** The 15/10/5/1-minute
    milestones are gone: minutes drift with the average service time, a
    count does not. A waiting customer gets one alert each at 3, 2 and 1
    people ahead and at 0 ("You're next"), skipped ones marked sent so they
    never fire late (`NOTIFICATION_POSITIONS_AHEAD`, `decidePositionMilestone`).
    Each carries the estimated wait — the same figure the ticket screen
    shows — and **always says it is only an estimate and can change**.
    Being called sends a separate **"It's your turn"**, first, on every
    channel, marked `urgent` (stays up until dismissed, longer buzz) — sent
    even though the screen already says so, because the person may not be
    looking at it. Push plumbing that is easy to break again:
    - The messaging service worker lives at scope
      `/firebase-cloud-messaging-push-scope`, **not `/`**: at `/` it and the
      PWA's Workbox `sw.js` replace each other, and pushes FCM reports as
      delivered land in a worker with no push handler.
    - A visible page gets FCM messages through `onMessage`, not as a
      notification, so `src/lib/push.ts` shows them itself; urgency travels
      as `data.urgent`, since a page only receives title and body.
    - The SDK already displays `notification` payloads in the background;
      the worker only handles data-only messages, or every alert shows twice.
    - `APP_BASE_URL` must be set for production (`functions/.env.qjume-d483a`)
      or notification links point at the local dev server.
    - Every FCM send logs one "FCM send result" line, success included, with
      a per-token outcome and only the last 8 characters of each token.

14. **iPhone: a short ask, and a clipboard handover from Safari.** In a
    Safari tab iOS has no push at all, and a page cannot add itself to the
    Home Screen. So "Notify me" opens one line and two buttons: "Add to Home
    Screen" (shows the two Share-menu steps) and "No thanks" (states the
    consequence). The Home Screen app shares **no storage** with Safari —
    not the ticket memory, not the anonymous sign-in — and the web offers no
    device id to match them by (fingerprinting is out, on privacy grounds).
    So "Add to Home Screen" copies a link holding a 144-bit single-use token
    the device generated (`startTransfer` stores its hash; one hour TTL), and
    the installed app offers "Continue my place from Safari", which pastes it
    and calls `claimTransfer`. It can fail quietly, so the steps always end
    with "otherwise join again in the app — and leave this queue first".
    Android needs none of this: an installed Chrome PWA shares Chrome's
    storage. Turning push on in a browser tab when Qjume is not installed
    also suggests installing (`src/lib/install.ts`), using
    `getInstalledRelatedApps` via the manifest's `related_applications`.

15. **The resume code stays with staff.** PRD 4.4 shows every joiner their
    code; nearly nobody needs it — the phone remembers the place — so it was
    noise. No code dialog after joining; entering one is a faint "Got a code
    from staff?" link at the bottom of the queue page. Staff issue a code on
    demand with "Give code" (`relinkTicket`) when a customer asks. Codes are
    deliberately **not** shown beside every name on the serve screen: they
    are stored hashed, and a two-character code anyone can read over a
    shoulder is a key to that person's place.

16. **"Your queues" is the way back to a ticket.** The landing page and Find
    lead with a quiet panel of the queues this device holds (from
    `myTickets`), with live place and wait; finished tickets drop out and are
    forgotten. The installed app, opened with exactly one active queue, goes
    straight to it — once per launch, never in a browser tab. Notification
    choice is remembered per ticket, so returning shows "Disable
    notifications" rather than asking again.

17. **Danish is the default language.** Unprefixed paths (`/find`, `/q/…`)
    render Danish; English lives under `/en/…`. `/da/…` still renders Danish,
    because it was the Danish prefix while English was the default and old
    links point at it. Build paths with `withLocale`/`stripLocale` in
    `src/lib/i18n/locale.ts`, never by hand. The language switch shows the
    *other* language's own name, on every page including the landing page,
    and keeps the query string (the monitor's `?shop=…&queue=…`).
    **Notifications follow the customer's language**: `TicketContact.locale`
    is set on joining and replaced when they turn notifications on (or the
    app re-registers after a language switch), and every notice and email is
    worded from `functions/src/notifications/messages.ts`, Danish when no
    language is stored. Write a new notice there, in both languages.

18. **One wait estimate, divided by the tills serving now.** People ahead ×
    service time ÷ staffed tills, worked out only in
    `src/lib/queue/waitTime.ts` and used by every screen and notification.
    The service time is the learned `observedServiceTimeSeconds`, falling back
    to the owner's `avgServiceTimeSeconds` until anything has been learned.
    A till counts only while its `serving` flag is set (minimum one) —
    stations are never deleted, so counting documents divided the wait among
    tills opened days ago. Lists that cannot read every queue's stations use
    `Queue.servingStations`, a server-owned count kept by `startServing`,
    `stopServing` and `sweepAbandonedQueues`. Till *labels* still show
    whenever a queue has more than one station at all, staffed or not.

## Architecture notes

**`/s/:shopId` is the public shop page**, listing every queue at one shop. It
is reached from the shop's name on a queue detail page and from "N other
queues". Deliberately not under `/shop`, which is the owner's area.

**A shop runs several queues, and a queue has one or more tills.** A
discovery row names the queue as well as the shop, or a shop with three lines
is three identical rows. Station labels ("Till 1") are hidden wherever the
queue has a single station — a name only tells you something when there is
another one to tell it apart from — and `ticket.station` is an **id**, so
anything showing it to a person must look up the label.

**A till is "kasse" in Danish and "till" in English — never "station" on
screen** (the code still says `Station`). An unnamed till is stored as
"Till N"; every reader sees it through `tillLabel` (`src/lib/tills.ts`), so
it reads "Kasse N" in Danish — staff, the monitor, the called customer and
their notification alike — while a name the shop typed is shown as is. With
several tills the serve screen names the one you stand at, and the monitor
shows a tile per till: who is being served there, "Klar", or "Lukket". The
in-shop screen is called **Monitor** in both languages.

**Tills are deleted from the picker** ("Hvilken kasse betjener du fra?", so
reached through "Skift kasse"): a quiet "Slet" beside each till that is not
serving and has nobody at it, confirmed inline. `deleteStation` checks the
same in a transaction and refuses with `station-in-use`; staff may delete as
well as the owner, the same people who open tills. A new unnamed till takes
the lowest free number (`nextTillNumber`), not the count, or deleting Till 2
of three would make the next one a second "Till 3". A device whose
remembered till was deleted elsewhere drops back to the picker.

**A customer being served belongs to the till, not to the person behind
it** (`station.currentTicketId`). So "Change station" asks "Done with
{name}?" first and finishes them with `callNext({ finishOnly: true })` —
counted, without calling anyone to a till nobody stands at — then stops the
old till and lets the newly picked one start serving. The serve screen does
not remount on a switch, so `leaveStation` resets the start guard itself, and
the picker does not auto-take the only till after a deliberate switch.

## Design system

`src/index.css` is the implementation of the QjuMe design canvas; the extracted
spec is in `docs/design-system.md`. Things that are easy to undo by accident:

- **Two oranges, not one.** `--orange` (bright) fails contrast below 24px and is
  for large or decorative use only. `--orange-cta` is the 4.5:1-safe text and
  button colour. Never swap one for the other to "match" something.
- **One committed look, not a light/dark pair.** Ink fills the viewport; there
  is no dark-mode variant because the design defines one world and inverting it
  would invent a scheme nobody drew.
- **Two surfaces, each with its own text colour.** The page is ink with white
  text; a card is white with ink text (`--card` / `--card-fg`). Anything setting
  a background must set the matching foreground, or it inherits white onto
  white. The canvas's cream page is gone — cream survives only as
  `--cream-tint`, the icon and badge fill *inside* white cards.
- **The gutter is set once**, on `.app`, with the safe-area insets folded in.
  Screens lay out inside it and never add side padding of their own. Heights
  use `dvh`, not `vh`, or the ink stops short of the bottom on a phone. There
  is no page-width cap: the app uses the whole window, and the limits that
  keep prose readable live on the text blocks instead.
- **A list row's shape follows its container, not the viewport.** A card in a
  three-column grid on a laptop is narrower than the same card in a
  single-column list on a tablet, so the figures sit under the name by default
  and only go beside it in the 461–759px window where the column is wide.
- **The app header is rendered by the shell**, not by each screen, so every
  route has a way back to the landing page without anyone remembering to add
  one. It hides itself on `/`. Do not reintroduce per-screen logos.
- **An installed app updates itself** (`src/lib/appUpdate.ts`). The browser
  only checks for a new service worker on a full page load, which an app left
  open in the background almost never does, and a running page keeps its old
  JavaScript even after a new worker takes over. So it checks every time the
  app returns to the front, and reloads once a new version controls it —
  at once, unless an input is focused or a dialog is open, else when the app
  is next put away. Without this, a deployed fix could take days to reach a
  shop's phone.
- **Fonts are self-hosted**, not linked from Google. A linked font costs a
  round-trip before first paint and renders nothing offline — wrong for a PWA
  built to survive a dropped network. Sora ships as one variable file covering
  every weight. DM Mono has nothing above 500, so the design's 600/700 mono
  labels map to 500 rather than being synthesised into a fake bold.

## iOS push — read before touching notifications

Web push does not work in a Safari tab. The PWA must be added to the Home Screen first
(iOS 16.4+), the manifest must set `display: standalone`, and the permission prompt must
be triggered by a user gesture.

Practical consequence: a meaningful share of iOS customers will never grant push. The
in-app live position view and email fallback are load-bearing, not nice-to-haves. Do not
build a flow that assumes push works.

## Emulator blind spot: indexes

The emulator needs no indexes, so a query that production refuses for want of
one passes every test. Every resume code failed in production for weeks that
way (`claimTicket`'s collection-group lookup on `private.resumeCodeHash`).
Any new `collectionGroup` query, or a compound one, gets its index in
`firestore.indexes.json` in the same change, and after deploying, the Cloud
Functions logs are the place to look for `FAILED_PRECONDITION ... requires
an index`.

## Conventions

- **Always push and deploy.** Finished work is committed, pushed, opened as a PR and
  merged to `main`, which is what deploys it (`deploy-firebase.yml`). Do not stop at a
  pushed branch and wait to be asked.
- TypeScript strict mode on.
- Shared types for Firestore documents in `src/types/`, imported by both the app and
  functions — the two must not drift.
- Firestore access goes through a data layer in `src/lib/firestore/`. No raw SDK calls
  scattered through components.
- Use the Firebase Emulator Suite for local development. Do not develop against the live
  project.
- Security rules are written alongside the feature that needs them, not retrofitted.
- Every Cloud Function that mutates queue state gets a unit test.

## Repo layout

```
/src            React app
  /components
  /routes       customer/, shop/, monitor/
  /lib/firestore
  /types
/functions      Cloud Functions
/firestore.rules
/database.rules.json
```

## Not in scope

Do not build these; they were considered and rejected. See PRD section 11.

- Ratings or reviews
- Timer-based auto-advance
- Showing customer distance or presence to the shop
- Separate walk-in queues
- Forced customer login
