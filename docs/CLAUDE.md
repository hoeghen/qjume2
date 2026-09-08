# Qjume — project context

Read `qjume-prd.md` for the full product spec. This file covers conventions and the
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
