import { initializeApp } from 'firebase-admin/app';

initializeApp();

/**
 * Phase 1 adds the queue-mechanics callables here: `joinQueue`, `callNext`,
 * `leaveQueue`, `removeTicket`. They are the only path by which a ticket
 * reaches `serving`, `served` or `noShow` — clients never write those states
 * directly (CLAUDE.md invariant 1), and `callNext` resolves the current ticket
 * and assigns the next one inside a single Firestore transaction (invariant 2).
 *
 * Types come from `src/types/`, shared with the app so the two cannot drift.
 */
export {};
