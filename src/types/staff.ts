/**
 * Someone who can serve a shop's queues without owning it.
 *
 * On every plan. Staff run the counter; they cannot change queue settings,
 * and they cannot see or touch billing or the shop's settings.
 */
export interface StaffMember {
  /** Shown in the shop's staff list, since a uid means nothing to a human. */
  email: string | null;
  /**
   * What the owner calls them, typed when adding them. Only for the staff
   * list; customers never see it. Absent on staff added before it existed.
   */
  name?: string | null;
  addedAt: number;
  addedBy: string;
}

/** What a caller is allowed to do with a shop. */
export type ShopAccess = 'owner' | 'staff' | 'none';

/**
 * Denormalised reverse index: which shop a uid is staff at, at
 * `staffMemberships/{uid}` — one per person, the same "one shop" assumption
 * `shopsOwnedBy` already makes for owners.
 *
 * Exists only because Firestore cannot authorize a collection-group `list`
 * query by a `resource.data` field match (confirmed against the emulator,
 * not assumed) — the per-shop `shops/{shopId}/staff/{uid}` doc is fine for a
 * direct `get` once the shop is already known, but there is no rules-safe
 * way to ask "which shop is this uid staff at" without knowing shopId first.
 * A top-level doc, keyed by uid and written by the same Cloud Function that
 * grants staff access, sidesteps that limitation entirely: it's a plain
 * `get` by a path the caller already knows (their own uid).
 */
export interface StaffMembership {
  shopId: string;
}
