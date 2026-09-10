/** Fixed list of eleven. See PRD 4.2. */
export const QUEUE_CATEGORIES = [
  'food-and-drink',
  'health-and-medical',
  'government-and-public-services',
  'banking-and-finance',
  'retail-and-shopping',
  'personal-care',
  'automotive',
  'education',
  'transport-and-travel',
  'events-and-attractions',
  'other',
] as const;

export type QueueCategory = (typeof QUEUE_CATEGORIES)[number];

/** Owner-configured penalty applied when a called customer is not present. */
export type NoShowPenalty = 'back' | 'back3' | 'back5';

/**
 * `unavailable` is set by the server when the shop's heartbeat drops. The queue
 * stays open and keeps serving from the shop device's cache, but takes no new
 * joiners. See CLAUDE.md invariant 4.
 */
export type QueueStatus =
  | 'open'
  | 'drainMode'
  | 'paused'
  | 'unavailable'
  | 'closed';

export interface QueueSchedule {
  opensAt: string;
  closesAt: string;
  /** 0 = Sunday, matching `Date.prototype.getDay`. */
  days: number[];
}

export interface Queue {
  name: string;
  description: string | null;
  category: QueueCategory;
  maxSize: number;

  /** Owner-entered address, geocoded at save time. Never device location. */
  address: string;
  lat: number;
  lng: number;
  /** For radius queries via `geofire-common`. See PRD 9.3. */
  geohash: string;

  /** Seeded by the owner, then refined from observed service times. PRD 9.5. */
  avgServiceTimeSeconds: number;
  noShowPenalty: NoShowPenalty;
  status: QueueStatus;
  schedule: QueueSchedule | null;

  currentNumber: number;
  lastIssuedNumber: number;
  /**
   * Highest `position` sort key handed out so far. Monotonic, and the only
   * source of a "back of the queue" position — deriving one from the ticket
   * number instead would let a new joiner land ahead of someone a no-show
   * penalty had just sent to the back.
   */
  lastPosition: number;
  /**
   * When a customer was last called at this queue. Feeds the rolling
   * service-time average behind the wait estimate (PRD 9.5).
   */
  lastServedAt: number | null;
  /** Denormalised for list and map queries. */
  waitingCount: number;
}
