import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import type { Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { MOBILEPAY_SECRETS_IF_ENABLED } from '../lib/secrets.js';
import { addDays, isoDate, nextMonthlyDue } from './applyPlan.js';
import { MobilePayApiError, mobilePayApi, mobilePayConfigFromEnv, type MobilePayApi } from './mobilepayApi.js';
import { PRODUCT_NAME, mobilePayPriceOre } from './mobilepay.js';
import { downgradeAgreement } from './mobilepayWebhook.js';
import type { MobilePaySubscription, Shop } from '../../../src/types/index.js';

/**
 * How far ahead of its due date a charge is created. MobilePay needs at
 * least a day, and shows an upcoming charge in the owner's app, so a few
 * days' notice also gives them warning.
 */
export const CHARGE_LEAD_DAYS = 4;

export interface ChargeRunResult {
  charged: string[];
  stopped: string[];
  failed: string[];
}

/**
 * Creates each MobilePay subscription's next monthly charge.
 *
 * MobilePay never charges an agreement on its own, so without this a shop
 * would pay for its first month and never again. Safe to run more than once
 * a day, or to retry after a crash: a charge's `orderId` is derived from the
 * shop and the period it pays for, and MobilePay will not create the same
 * one twice.
 */
export async function performChargeMobilePaySubscriptions(
  firestore: Firestore,
  api: () => MobilePayApi,
  amount: () => number,
  now: Date = new Date(),
): Promise<ChargeRunResult> {
  const result: ChargeRunResult = { charged: [], stopped: [], failed: [] };
  const today = isoDate(now);

  // A stopped subscription has a null `nextChargeDue`, which a string range
  // never matches — no composite index needed to leave it out.
  const due = await firestore
    .collection('subscriptions')
    .where('nextChargeDue', '<=', addDays(today, CHARGE_LEAD_DAYS))
    .get();

  for (const doc of due.docs) {
    const subscription = doc.data() as MobilePaySubscription;
    if (subscription.status !== 'active' || !subscription.nextChargeDue) continue;
    const shopId = doc.id;

    try {
      const shop = (await firestore.doc(`shops/${shopId}`).get()).data() as Shop | undefined;
      if (shop?.plan !== 'paid') {
        // Deleted, or back on free by some other path: either way not a shop
        // anyone should be charging. Stop the agreement so the owner's app
        // stops showing it as active.
        await api().stopAgreement(subscription.agreementId);
        await doc.ref.update({ status: 'stopped', nextChargeDue: null });
        result.stopped.push(shopId);
        continue;
      }

      const period = subscription.nextChargeDue;
      try {
        await api().createCharge(subscription.agreementId, {
          amount: amount(),
          description: PRODUCT_NAME,
          // A run that fell behind charges as soon as MobilePay allows.
          due: period > addDays(today, 1) ? period : addDays(today, 1),
          orderId: `qjume-${shopId}-${period.replaceAll('-', '')}`,
        });
      } catch (e) {
        if (!(e instanceof MobilePayApiError)) throw e;
        // Most often an agreement the owner stopped in their app, if that
        // webhook was missed. Ask, rather than retry it every day.
        const { status } = await api().getAgreement(subscription.agreementId);
        if (status === 'ACTIVE') throw e;
        await downgradeAgreement(firestore, subscription.agreementId, `agreement ${status}`);
        result.stopped.push(shopId);
        continue;
      }

      // Only if nothing else touched it since it was read — a cancellation
      // in the meantime must not be overwritten with a new due date.
      await doc.ref.update(
        { nextChargeDue: nextMonthlyDue(period, subscription.billingDay) },
        { lastUpdateTime: doc.updateTime },
      );
      result.charged.push(shopId);
    } catch (e) {
      // One shop's failure must not hold up the rest; tomorrow's run retries.
      logger.error('MobilePay: charging run failed for shop', {
        shopId,
        error: (e as Error).message,
      });
      result.failed.push(shopId);
    }
  }

  if (due.size > 0) logger.info('MobilePay charging run', result);
  return result;
}

export const chargeMobilePaySubscriptions = onSchedule(
  {
    schedule: 'every day 06:00',
    timeZone: 'Europe/Copenhagen',
    secrets: MOBILEPAY_SECRETS_IF_ENABLED,
  },
  async () => {
    // Built lazily: with nothing due — every day before the first MobilePay
    // subscriber — this run needs no MobilePay config at all.
    let api: MobilePayApi | undefined;
    await performChargeMobilePaySubscriptions(
      db,
      () => (api ??= mobilePayApi(mobilePayConfigFromEnv())),
      () => mobilePayPriceOre(),
    );
  },
);
