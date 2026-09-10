/**
 * `serving`, `served` and `noShow` are server-only transitions. A client must
 * never write them: they are reachable solely through Cloud Functions, and the
 * security rules reject client writes. A customer advancing themselves is the
 * main abuse vector in this app. See CLAUDE.md invariant 1.
 */
export type TicketState =
  | 'waiting'
  | 'serving'
  | 'served'
  | 'noShow'
  | 'removed'
  | 'left';

/** Milestones dispatched ahead of the estimated turn, in minutes. PRD 9.6. */
export const NOTIFICATION_MILESTONES_MINUTES = [15, 10, 5, 1] as const;

export type NotificationMilestone =
  (typeof NOTIFICATION_MILESTONES_MINUTES)[number];

/** Three no-shows removes a ticket. Per ticket, per queue. Invariant 3. */
export const NO_SHOW_REMOVAL_THRESHOLD = 3;

export interface Ticket {
  /** Used by staff when calling the customer ("Marta, Till 2"). */
  displayName: string;
  number: number;
  position: number;

  state: TicketState;
  noShowCount: number;
  /** Set when the ticket is assigned to a station. */
  station: string | null;

  joinedAt: number;
  calledAt: number | null;

  /** Exactly one is set: customers are anonymous unless they upgrade. */
  customerUid: string | null;
  anonymousId: string | null;

  /** Lets the customer reclaim this ticket on another device. PRD 4.8. */
  resumeCodeHash: string;

  email: string | null;
  phone: string | null;
  fcmTokens: string[];

  /** Milestones already dispatched, so an advance cannot duplicate one. */
  dispatchedMilestones: NotificationMilestone[];
}
