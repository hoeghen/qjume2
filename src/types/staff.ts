/**
 * Someone who can serve a shop's queues without owning it.
 *
 * A paid feature (PRD 8). Staff run the counter; they cannot change queue
 * settings, and they cannot see or touch billing.
 */
export interface StaffMember {
  /** Shown in the shop's staff list, since a uid means nothing to a human. */
  email: string | null;
  addedAt: number;
  addedBy: string;
}

/** What a caller is allowed to do with a shop. */
export type ShopAccess = 'owner' | 'staff' | 'none';
