import type { Plan } from '../../../src/types/index.js';

/**
 * Taking payment.
 *
 * The provider is still an open question (PRD 12.5), so this is the seam it
 * plugs into rather than a choice made on the user's behalf. What matters for
 * correctness is on this side of the seam: a plan changes only when a provider
 * confirms a completed payment, never because a client said so.
 */
export interface CheckoutSession {
  /** Where to send the owner to pay. */
  url: string;
  sessionId: string;
}

export interface CompletedCheckout {
  shopId: string;
  plan: Plan;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(shopId: string, plan: Plan): Promise<CheckoutSession>;
  /**
   * Confirm a session actually completed, asking the provider rather than
   * trusting what the browser came back with. Returns null if it did not.
   */
  verifyCheckout(sessionId: string): Promise<CompletedCheckout | null>;
}
