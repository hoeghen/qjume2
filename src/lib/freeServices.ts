import { FREE_SERVICES_DEFAULT, type Shop } from '../types/index.js';

/**
 * The free-services counter, read the same way by the app and by the Cloud
 * Functions so the number on the serve screen is the one the server enforces.
 * Shops created before the counter existed have neither field; they read as
 * the default allowance with nothing used yet.
 */
type Counted = Pick<Shop, 'plan' | 'freeServicesGranted' | 'servicesUsed'>;

export function freeServicesGranted(shop: Counted): number {
  return shop.freeServicesGranted ?? FREE_SERVICES_DEFAULT;
}

export function servicesUsed(shop: Counted): number {
  return shop.servicesUsed ?? 0;
}

export function freeServicesRemaining(shop: Counted): number {
  return Math.max(0, freeServicesGranted(shop) - servicesUsed(shop));
}

/**
 * Whether the shop may take on new customers. A subscription always may; a
 * free shop may while it has free services left. Running out never stops
 * staff serving the people already waiting — only new joins and walk-ins.
 */
export function takesNewCustomers(shop: Counted): boolean {
  return shop.plan === 'paid' || freeServicesRemaining(shop) > 0;
}
