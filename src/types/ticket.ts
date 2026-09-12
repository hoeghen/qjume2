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

/**
 * The public half of a ticket.
 *
 * Readable by anyone, because it has to be: the in-shop monitor shows the next
 * few customers by name to a room full of strangers (PRD 5.7), and a customer
 * can only work out their own place in the queue by counting the tickets ahead
 * of them. Both need these fields without signing in.
 *
 * Nothing that identifies a person beyond the name they chose to be called by
 * lives here — see `TicketContact`.
 */
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

  /**
   * Opaque, queue-scoped stand-in for whoever holds this ticket, used to stop
   * one person joining the same queue twice.
   *
   * A hash of their id salted with the queue id, so the same person in two
   * different queues produces two unrelated values — publishing the raw uid
   * here would let anyone reading a monitor link a stranger's visits across
   * shops. Null for a walk-in, who holds no account at all.
   */
  holderKey: string | null;
}

/**
 * The private half of a ticket, at `tickets/{id}/private/contact`.
 *
 * Readable only by the person holding the ticket and the shop serving it.
 * Everything here either identifies a real person or is a credential.
 */
export interface TicketContact {
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

/** Document id of the private half, under a ticket's `private` subcollection. */
export const TICKET_CONTACT_DOC = 'contact';
