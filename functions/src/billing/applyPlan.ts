import { logger } from 'firebase-functions';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { fail } from '../lib/errors.js';
import { syncFreeServicesFlag } from '../lib/freeServices.js';
import type { CompletedCheckout } from './provider.js';
import type { MobilePaySubscription, Shop } from '../../../src/types/index.js';

/** `YYYY-MM-DD` of a date, in UTC. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Whole days added to a `YYYY-MM-DD`. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

/**
 * The same day of the next month, or that month's last day when it is
 * shorter — measured from `billingDay`, not from `day`, so a subscription
 * started on the 31st goes 31 Jan → 28 Feb → 31 Mar instead of creeping
 * back to the 28th for good.
 */
export function nextMonthlyDue(day: string, billingDay: number): string {
  const [year, month] = day.split('-').map(Number) as [number, number];
  const nextMonthIndex = month; // `month` is 1-based, so this is next month 0-based.
  const lastDay = new Date(Date.UTC(year, nextMonthIndex + 1, 0)).getUTCDate();
  return isoDate(new Date(Date.UTC(year, nextMonthIndex, Math.min(billingDay, lastDay))));
}

/**
 * Apply a plan change the provider has already vouched for.
 *
 * Shared by the owner's return from checkout (`performCompleteCheckout`) and
 * by MobilePay's webhook, which can be the only one to hear of an agreement
 * if the owner never comes back to the app. Both may arrive for the same
 * agreement, so this is idempotent: an agreement already recorded as active
 * is left alone, keeping its charge schedule.
 */
export async function applyPlanChange(
  firestore: Firestore,
  completed: CompletedCheckout,
  providerName: string,
  now: Date = new Date(),
): Promise<void> {
  const shopRef = firestore.doc(`shops/${completed.shopId}`);
  const subscriptionRef = firestore.doc(`subscriptions/${completed.shopId}`);

  await firestore.runTransaction(async (tx: Transaction) => {
    const [shopSnap, subscriptionSnap] = await Promise.all([
      tx.get(shopRef),
      tx.get(subscriptionRef),
    ]);
    const shop = shopSnap.data() as Shop | undefined;
    if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');
    const subscription = subscriptionSnap.data() as MobilePaySubscription | undefined;

    const update: Partial<Shop> = { plan: completed.plan };
    // Only Stripe hands these back, and only on an upgrade — a downgrade's
    // completed checkout has nothing new to record. Leaving them out of the
    // update rather than writing `undefined` keeps whatever a previous
    // upgrade already stored.
    if (completed.stripeCustomerId !== undefined) {
      update.stripeCustomerId = completed.stripeCustomerId;
    }
    if (completed.stripeSubscriptionId !== undefined) {
      update.stripeSubscriptionId = completed.stripeSubscriptionId;
    }
    tx.update(shopRef, update);

    const agreementId = completed.mobilePayAgreementId;
    if (agreementId) {
      const alreadyActive =
        subscription?.status === 'active' && subscription.agreementId === agreementId;
      if (!alreadyActive) {
        if (subscription?.status === 'active') {
          // Two checkouts accepted back to back. Only the newer one is
          // charged from here on; the older one is left for MobilePay to
          // show as an agreement nobody bills.
          logger.warn('MobilePay: replacing an active agreement', {
            shopId: completed.shopId,
            previous: subscription.agreementId,
            next: agreementId,
          });
        }
        // The initial charge paid for the first month; the next is a month on.
        const today = isoDate(now);
        const billingDay = now.getUTCDate();
        const next: MobilePaySubscription = {
          provider: 'mobilepay',
          shopId: completed.shopId,
          agreementId,
          status: 'active',
          nextChargeDue: nextMonthlyDue(today, billingDay),
          billingDay,
          activatedAt: now.toISOString(),
        };
        tx.set(subscriptionRef, next);
      }
    } else if (completed.plan === 'free' && subscription?.status === 'active') {
      tx.update(subscriptionRef, { status: 'stopped', nextChargeDue: null });
    }
  });

  // A subscription lifts the free-services count, and losing one brings it
  // back: either way the queues' discovery copy may need to change.
  await syncFreeServicesFlag(firestore, completed.shopId);

  logger.info('Plan changed', {
    shopId: completed.shopId,
    plan: completed.plan,
    provider: providerName,
  });
}
