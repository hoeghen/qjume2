import {
  NOTIFICATION_POSITIONS_AHEAD,
  type NotificationPositionMilestone,
  type Queue,
} from '../../../src/types/index.js';
import { estimatedWaitSeconds } from '../../../src/lib/queue/waitTime.js';

/**
 * Closeness alerts cannot be scheduled when someone joins, because the queue
 * moves under them: people leave, get skipped, a till opens. They are
 * recalculated on every advance instead, and this decides what that advance
 * should send. They count people, not minutes — see
 * `NOTIFICATION_POSITIONS_AHEAD`.
 */

export interface PositionMilestoneDecision {
  /** How many people are ahead for the one alert to send now, or null. */
  send: NotificationPositionMilestone | null;
  /** Every milestone now passed, including any skipped over. */
  dispatched: NotificationPositionMilestone[];
}

/**
 * Which alert to send for a ticket with `peopleAhead` still ahead of it.
 *
 * A queue can jump: a run of no-shows or a penalty drops someone from fifth
 * straight to second. That crosses 3 and 2 in one advance, and two alerts at
 * once would be absurd — so only the most urgent is sent, and the ones
 * leapfrogged are marked dispatched so they never fire late.
 */
export function decidePositionMilestone(
  peopleAhead: number,
  alreadyDispatched: readonly NotificationPositionMilestone[],
): PositionMilestoneDecision {
  if (peopleAhead < 0) return { send: null, dispatched: [] };

  const crossed = NOTIFICATION_POSITIONS_AHEAD.filter(
    (p) => peopleAhead <= p && !alreadyDispatched.includes(p),
  );

  if (crossed.length === 0) return { send: null, dispatched: [] };

  // The list runs 3, 2, 1, 0 — the last crossed is the most urgent.
  const send = crossed[crossed.length - 1] as NotificationPositionMilestone;
  return { send, dispatched: [...crossed] };
}

/**
 * Estimated minutes until a waiting ticket's turn.
 *
 * `peopleAhead` rather than a position number, so this matches exactly what
 * the customer is looking at on their own screen. Two different numbers for
 * the same question would be worse than none — which is why the arithmetic
 * itself lives in `src/lib/queue/waitTime.ts`, shared with every screen.
 */
export function waitMinutesFor(
  peopleAhead: number,
  queue: Pick<Queue, 'avgServiceTimeSeconds' | 'observedServiceTimeSeconds'>,
  tills: number,
): number {
  return Math.round(estimatedWaitSeconds(peopleAhead, queue, tills) / 60);
}
