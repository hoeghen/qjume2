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
  /**
   * Provider-specific handles for whatever this checkout set up, persisted
   * onto the shop so a later "move to free" (a cancellation, not a new
   * checkout) knows what to cancel. `undefined` for providers with nothing
   * to hand back — the stub, and a downgrade to free, which cancels rather
   * than creates.
   */
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(shopId: string, plan: Plan): Promise<CheckoutSession>;
  /**
   * Confirm a session actually completed, asking the provider rather than
   * trusting what the browser came back with. Returns null if it did not.
   */
  verifyCheckout(sessionId: string): Promise<CompletedCheckout | null>;
  /**
   * A link to the provider's own self-serve invoice history, for a shop that
   * has one. Optional: the stub has no real invoices to show. Returns null
   * when this particular shop has nothing to show one for (never checked
   * out), as distinct from the provider simply not offering one at all.
   */
  createPortalSession?(shopId: string): Promise<{ url: string } | null>;
}
