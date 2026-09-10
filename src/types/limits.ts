/**
 * Free-tier limits. These are enforced server-side in Cloud Functions, not just
 * hidden in the UI — a client cannot exceed them by manipulating requests.
 * See CLAUDE.md invariant 5 and PRD 8.
 */
export const FREE_TIER_LIMITS = {
  /** One active queue per shop. */
  maxQueues: 1,
  /** Roughly twenty people waiting at once. */
  maxWaiting: 20,
  /** One server at a time; parallel stations are a paid feature. */
  maxStations: 1,
} as const;
