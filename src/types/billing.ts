/**
 * Server-only billing state for providers that, unlike Stripe, do not bill on
 * their own. Neither document is readable or writable by any client (see
 * `firestore.rules`): a shop document is public, and nothing a client can
 * touch should decide whether, or what, a shop gets charged.
 */

/**
 * A MobilePay recurring agreement the shop has accepted, at
 * `subscriptions/{shopId}`.
 *
 * MobilePay's Recurring API holds the shop's consent to be charged, but it
 * never creates a charge by itself — the merchant has to, every period. So
 * this records when the next one is due, and `chargeMobilePaySubscriptions`
 * creates it. See CLAUDE.md decision 12.
 */
export interface MobilePaySubscription {
  provider: 'mobilepay';
  shopId: string;
  agreementId: string;
  status: 'active' | 'stopped';
  /**
   * `YYYY-MM-DD` of the next charge to create, or null once stopped — null
   * also keeps a stopped subscription out of the charging run's range query.
   */
  nextChargeDue: string | null;
  /**
   * Day of the month the subscription started on, so a subscription that
   * began on the 31st is charged on the last day of a shorter month and then
   * back on the 31st, rather than drifting earlier every month.
   */
  billingDay: number;
  activatedAt: string;
}

/**
 * A MobilePay checkout that has been started, at `billingSessions/{sessionId}`.
 *
 * The session id is what comes back on the redirect, and what the webhook
 * uses to find the shop when an agreement is activated — including when the
 * owner never makes it back to the app, which MobilePay warns is common.
 */
export interface MobilePayBillingSession {
  provider: 'mobilepay';
  shopId: string;
  agreementId: string;
  createdAt: string;
}
