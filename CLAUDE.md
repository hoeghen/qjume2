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

5. **Discovery is always ordered by distance, closest twenty.** The list is
   cut by count, not by distance: `Filters.radiusKm` is `null` by default and
   the distance filter is one of the controls in the panel, off until someone
   sets it. `SEARCH_RADIUS_KM` in `CustomerHome` is a separate thing — the
   bound the geohash lookup queries against, which the filter narrows but can
   never widen past. There is no sort control; `applyFilters` still supports
   the other sort keys and is still tested, the screen just never asks for
   them. Name order is the fallback for when the browser refuses a position,
   because then there is no distance to order by.

4. **Discovery rows show the wait and the waiting count.** PRD 4.1 keeps the
   list to shop name and address, with numbers behind the tap-through. The
   design canvas puts them on the row, and the list can already be *sorted* by
   wait — a sort key you cannot see is a poor trade. `DiscoveredQueue` already
   carries both, so this costs no extra read.

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
