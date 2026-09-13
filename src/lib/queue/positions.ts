/**
 * Ordering of waiting tickets.
 *
 * `position` is a sort key, not the number shown to the customer — the display
 * position is the ticket's index in the ordered waiting list. Keeping it a
 * sparse key means the common path (serve one, call the next) needs no
 * reordering writes at all: tickets keep the position they were issued, and
 * `callNext` simply takes the lowest.
 *
 * Only a no-show penalty reorders, and only the penalised ticket moves.
 */

/** Gap left between consecutively issued positions, so tickets can slot between. */
export const POSITION_GAP = 1000;

export function firstPosition(): number {
  return POSITION_GAP;
}

export function nextPosition(lastPosition: number): number {
  return lastPosition + POSITION_GAP;
}

/**
 * A position strictly between `a` and `b`, or `null` when the interval is too
 * narrow to split at double precision. Callers must handle `null` by
 * reindexing rather than emitting a duplicate position.
 */
export function positionBetween(a: number, b: number): number | null {
  const mid = a + (b - a) / 2;
  return mid > a && mid < b ? mid : null;
}

/** A position after everything currently waiting. */
export function positionAtBack(lastPosition: number): number {
  return lastPosition + POSITION_GAP;
}

/**
 * Evenly spaced positions for a full reindex of the waiting list, used as the
 * fallback when an interval can no longer be split.
 */
export function reindexedPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * POSITION_GAP);
}
