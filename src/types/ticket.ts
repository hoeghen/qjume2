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

/**
 * When a waiting customer is told how close they are: by how many people are
 * still ahead, never by minutes. A count cannot drift the way a service-time
 * estimate can, so these land at the same real moments however good or bad
 * the queue's average is — 3, 2 and 1 people ahead, then 0, "you're next".
 * Each carries the estimated wait, labelled as only an estimate. Being called
 * itself is a separate, urgent notice (`notifyCalled`).
 */
export const NOTIFICATION_POSITIONS_AHEAD = [3, 2, 1, 0] as const;

export type NotificationPositionMilestone =
  (typeof NOTIFICATION_POSITIONS_AHEAD)[number];

/** The languages a customer can be notified in. */
export type ContactLocale = 'da' | 'en';

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

  /**
   * The language notifications are written in: set on joining, updated when
   * notifications are turned on. Absent on older tickets, which get Danish,
   * the app's default.
   */
  locale?: ContactLocale | null;
  /** Position alerts already sent, so an advance cannot duplicate one. */
  dispatchedPositions: NotificationPositionMilestone[];
  /**
   * A pending handover to another app on the same phone (iPhone's Home
   * Screen app cannot see Safari's storage). Hash of a long single-use token
   * the device put on its own clipboard; cleared when claimed. Absent on
   * tickets that never started one.
   */
  transferTokenHash?: string | null;
  /** Epoch ms after which `transferTokenHash` no longer works. */
  transferExpiresAt?: number | null;
}

/** Document id of the private half, under a ticket's `private` subcollection. */
export const TICKET_CONTACT_DOC = 'contact';
