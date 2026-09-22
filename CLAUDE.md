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

5. **Free tier limits are enforced server-side**, not just hidden in the UI.

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
   radius. The mock reads every queue and takes the closest; Firestore widens
   through `SEARCH_RINGS_KM` only while it still needs results, because
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
   path, on either backend). Full control, not read-only: browse every shop
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

   **The mock gets a third identity, `local-admin`**, alongside
   `local-owner`/`local-guest` — see `signInAsPlatformAdmin` in
   `src/lib/auth.ts`. The mock has no Firebase to set a custom claim on, so
   this stands in for already holding one; there is deliberately no
   equivalent affordance on the real backend, where the claim is set by hand
   against one account and nothing in the app grants it. `/admin` is reached
   only by URL, the same as `/monitor` — nothing in the app links to it.

## Two backends, one app

The data layer sits behind `src/lib/firestore/` and `src/lib/functions.ts`, and
two implementations plug into it:

- **Firebase** — Firestore, Auth, and the seventeen Cloud Functions.
- **`src/lib/mock/`** — the same surface implemented in the browser, storing to
  `localStorage`. Not a cut-down preview: every callable is implemented, and
  ordering comes from `src/lib/queue/`, the same modules the Cloud Functions
  import, so the two cannot disagree about who is next.

`src/lib/mock/mode.ts` picks one **at build time**, so the unused one is
tree-shaken away. Firebase is chosen when `VITE_FIREBASE_API_KEY` is set,
because a build with no credentials cannot reach a project — that was a blank
page on deploy once. `VITE_BACKEND=mock|firebase` overrides the inference.

What the mock does not do is *enforce*. Every invariant above is a trust
boundary, and with the whole database on one device there is nobody to defend
it from. Enforcement lives in the rules and functions, which is why they still
carry the tests.

**`/s/:shopId` is the public shop page**, listing every queue at one shop. It
is reached from the shop's name on a queue detail page and from "N other
queues". Deliberately not under `/shop`, which is the owner's area.

**A shop runs several queues, and a queue has one or more tills.** The seed
exercises both: the pharmacy has three lines and two counters, the town hall
five counters across three lines. A discovery row names the queue as well as
the shop, or a shop with three lines is three identical rows. Station labels
("Till 1") are hidden wherever the queue has a single station — a name only
tells you something when there is another one to tell it apart from — and
`ticket.station` is an **id**, so anything showing it to a person must look up
the label.

**The mock's guest and owner are different identities.** `signInAsGuest` gives
an anonymous `local-guest`; only the email link makes you `local-owner`. The
session persists, so sharing one identity would hand any customer who joined a
queue the shop's admin screens. `ShopHome` also refuses an anonymous user,
which is right for both backends.

**Seeded ids are slugs, and must stay stable.** `mockId` ends in a timestamp,
which is right for anything minted while the app runs and wrong for the seed:
a join code is scanned by a phone that has never run this build, and
`shop3-mubxsbkw` means nothing there. So the seed ids come from the names —
`/q/riverside-pharmacy/prescriptions` — and the same document has the same id
on every device. Change the seed's shape and the stored copy cannot be read
back: bump `STORAGE_KEY` in `src/lib/mock/store.ts` rather than leaving one
device on ids another does not have.

What a scan cannot do in the mock is cross devices: the whole database is one
browser's `localStorage`, so a scanning phone joins its own copy of the queue.
The URL, the routing and the server rule are the real thing; the shared
database is what only Firestore provides.

**The seeded shops follow the viewer.** They are defined in `src/lib/mock/seed.ts`
as offsets in kilometres, and `placeMockShopsNear` resolves them against the
position discovery is querying from. Hardcoded coordinates meant an empty list
for everyone outside one city, and every browser check pinned to that city so
nothing caught it. Any test that exercises discovery should use a location that
is *not* the seed's fallback centre.

Do not reintroduce "demo" framing. The mock build is the product running on a
local backend, not a preview of it — no banners, and no copy telling people
their data is fake.

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

## Conventions

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
