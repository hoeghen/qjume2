import type { QueueStatus } from '../../../src/types/index.js';

/**
 * What a change in device presence should do to a queue's status, or null to
 * leave it alone.
 *
 * Deliberately narrow. Only `open` and `unavailable` are the server's to move
 * between; `paused`, `drainMode` and `closed` are states an owner chose, and a
 * flaky network must never undo a decision somebody made on purpose. The
 * asymmetry matters most on reconnect: a shop that closed while its tablet was
 * offline should stay closed when it comes back.
 */
export function nextStatusForPresence(
  current: QueueStatus,
  online: boolean,
): QueueStatus | null {
  if (online && current === 'unavailable') return 'open';
  // Still open, so everyone already waiting keeps their place — it just stops
  // taking anyone new, because nobody is there to serve them. Invariant 4.
  if (!online && current === 'open') return 'unavailable';
  return null;
}
