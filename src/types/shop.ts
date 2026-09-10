/** Billing plan. Free-tier limits are enforced server-side, never only in the UI. */
export type Plan = 'free' | 'paid';

/** Paid-tier shop profile. Absent on free-tier shops. */
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
}
