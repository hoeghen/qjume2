import type { QueueStatus } from '../../types/index.js';

/**
 * What a change in whether anyone is serving should do to a queue's status,
 * or null to leave it alone.
 *
 * Deliberately narrow. Only `open` and `unavailable` are the server's to move
 * between; `paused`, `drainMode` and `closed` are states an owner chose, and
 * staff starting or stopping serving must never undo a decision somebody made
 * on purpose. The asymmetry matters most when a station comes back: a queue
 * that closed while nobody was serving should stay closed when staff return.
 *
 * Shared between the Cloud Functions (`startServing`, `stopServing`, and the
 * abandoned-queue sweep), so the three cannot drift on what "anyone serving"
 * means for a queue's status.
 */
export function nextStatusForServing(
  current: QueueStatus,
  anyoneServing: boolean,
): QueueStatus | null {
  if (anyoneServing && current === 'unavailable') return 'open';
  // Still open, so everyone already waiting keeps their place — it just stops
  // taking anyone new, because nobody is there to serve them. Invariant 4.
  if (!anyoneServing && current === 'open') return 'unavailable';
  return null;
}
