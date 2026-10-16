/**
 * Which version of the Terms of Service an owner agrees to when they
 * subscribe. Bump it whenever the terms' wording changes (`legal.terms.*`
 * in the i18n files) so every recorded acceptance says which text it was.
 */
export const TERMS_VERSION = '2026-10-16';

/**
 * One owner ticking "I accept the terms" before a subscription, at
 * `termsAcceptances/{id}`. Written by `startCheckout` alone and readable by
 * no client: it is the record that the owner agreed, so nobody may edit it.
 * Top-level, so deleting a shop does not delete the evidence.
 */
export interface TermsAcceptance {
  shopId: string;
  uid: string;
  termsVersion: string;
  /** Milliseconds since the epoch, server clock. */
  acceptedAt: number;
}
