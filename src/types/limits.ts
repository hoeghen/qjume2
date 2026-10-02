/**
 * The free plan is the whole app, for a number of services rather than a
 * set of features: every shop starts with this many free services (customers
 * marked served), a platform admin can grant more, and a subscription lifts
 * the count altogether. Enforced server-side — see `takesNewCustomers` and
 * CLAUDE.md invariant 5.
 */
export const FREE_SERVICES_DEFAULT = 1000;

/** The subscription, in whole kroner per month, excluding VAT. */
export const SUBSCRIPTION_PRICE_DKK = 100;
