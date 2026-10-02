/** Billing plan: free (counted services) or a paid subscription. Enforced server-side. */
export type Plan = 'free' | 'paid';

/** Optional shop profile. */
export interface ShopProfile {
  logo: string | null;
  hours: string | null;
  phone: string | null;
  description: string | null;
}

export interface Shop {
  name: string;
  ownerUid: string;
  plan: Plan;
  /**
   * When true, a customer may hold a ticket in at most one of this shop's
   * queues (parallel tills serving the same thing). When false, the queues are
   * different services and may be joined together. See PRD 4.5.
   */
  exclusiveQueues: boolean;
  profile?: ShopProfile;
  /**
   * Set by a platform admin, not the owner — moderation, not the shop's own
   * open/closed toggle. A suspended shop drops out of discovery and refuses
   * new joiners everywhere, and the owner cannot lift it themselves; only an
   * admin's `reinstateShop` can. See CLAUDE.md decision 9.
   */
  suspended: boolean;
  /**
   * Stripe's own ids for this shop's subscription, set once a checkout
   * completes (`performCompleteCheckout`) and read back when the shop later
   * moves to free — that is a cancellation, not a new checkout, and needs to
   * know which subscription to cancel. Null for a shop that has never paid,
   * and for every shop under the stub provider, which invents no such id.
   */
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  /**
   * Free services this shop may use before it needs a subscription — the
   * default allowance plus whatever a platform admin has granted. Server-owned
   * like `plan`. Absent on shops that predate the counter: read it through
   * `freeServicesGranted` in src/lib/freeServices.ts, never directly.
   */
  freeServicesGranted?: number;
  /** Customers marked served, ever — counted by `callNext`. Server-owned. */
  servicesUsed?: number;
}
