import {
  NOTIFICATION_MILESTONES_MINUTES,
  NOTIFICATION_POSITIONS_AHEAD,
  type NotificationMilestone,
  type NotificationPositionMilestone,
} from '../../../src/types/index.js';

/**
 * Milestone alerts cannot be scheduled when someone joins, because the
 * estimate moves under them: people leave, staff speed up, a till opens. They
 * are recalculated on every advance instead, and this decides what that
 * advance should send. See PRD 9.6.
 */

export interface MilestoneDecision {
  /** The one alert to send now, or null. */
  send: NotificationMilestone | null;
  /** Every milestone now passed, including any skipped over. */
  dispatched: NotificationMilestone[];
}

/**
 * Which milestone to announce for a ticket whose turn is `waitMinutes` away.
 *
 * A queue can jump: five people leave at once and a twenty-minute wait becomes
 * four. That crosses 15, 10 and 5 in a single advance, and firing three alerts
 * at once would be absurd — so only the most urgent is sent, and the ones
 * leapfrogged are marked dispatched so they never fire late.
 */
export function decideMilestone(
  waitMinutes: number,
  alreadyDispatched: readonly NotificationMilestone[],
): MilestoneDecision {
  const crossed = NOTIFICATION_MILESTONES_MINUTES.filter(
    (m) => waitMinutes <= m && !alreadyDispatched.includes(m),
  );

  if (crossed.length === 0) return { send: null, dispatched: [] };

  // The list is ordered 15, 10, 5, 1 — the last crossed is the most urgent.
  const send = crossed[crossed.length - 1] as NotificationMilestone;
  return { send, dispatched: [...crossed] };
}

export interface PositionMilestoneDecision {
  /** The one position alert to send now, or null. */
  send: NotificationPositionMilestone | null;
  /** Every position milestone now passed, including any skipped over. */
  dispatched: NotificationPositionMilestone[];
}

/**
 * Which "you're getting close" alert to send for a ticket with `peopleAhead`
 * still ahead of it — a count, not an estimate, so it lands exactly on the
 * third- and second-in-line moments regardless of how the queue's average
 * service time is tracking. Same leapfrog handling as `decideMilestone`: a
 * penalty or a run of no-shows can drop someone straight from fifth to
 * second, and that should announce "second", not both in one advance.
 *
 * Nobody ahead (`peopleAhead <= 0`) is deliberately never this function's to
 * announce: `waitMinutesFor` returns 0 in exactly that case, so the existing
 * minute milestone `1` already fires "You're next" there. Sending a "second
 * in line" alert once the customer has actually reached the front would be
 * both a duplicate and a wrong label.
 */
export function decidePositionMilestone(
  peopleAhead: number,
  alreadyDispatched: readonly NotificationPositionMilestone[],
): PositionMilestoneDecision {
  if (peopleAhead <= 0) return { send: null, dispatched: [] };

  const crossed = NOTIFICATION_POSITIONS_AHEAD.filter(
    (p) => peopleAhead <= p && !alreadyDispatched.includes(p),
  );

  if (crossed.length === 0) return { send: null, dispatched: [] };

  const send = crossed[crossed.length - 1] as NotificationPositionMilestone;
  return { send, dispatched: [...crossed] };
}

/**
 * Estimated minutes until a waiting ticket's turn.
 *
 * `peopleAhead` rather than a position number, so this matches exactly what
 * the customer is looking at on their own screen. Two different numbers for
 * the same question would be worse than none.
 */
export function waitMinutesFor(
  peopleAhead: number,
  serviceTimeSeconds: number,
  activeStations: number,
): number {
  const stations = Math.max(1, activeStations);
  return Math.round((peopleAhead * serviceTimeSeconds) / stations / 60);
}
