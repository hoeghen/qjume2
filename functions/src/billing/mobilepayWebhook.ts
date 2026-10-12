import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { onRequest, type Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
import { logger } from 'firebase-functions';
import type { Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { MOBILEPAY_WEBHOOK_SECRETS_IF_ENABLED } from '../lib/secrets.js';
import { applyPlanChange } from './applyPlan.js';
import { mobilePayApi, mobilePayConfigFromEnv, type MobilePayApi } from './mobilepayApi.js';
import type {
  MobilePayBillingSession,
  MobilePaySubscription,
} from '../../../src/types/index.js';

/** The fields of a Recurring API webhook payload this app reads. */
export interface MobilePayEvent {
  eventType: string;
  agreementId: string;
  chargeId?: string | null;
  chargeType?: string | null;
  failureReason?: string | null;
}

/**
 * Checks a webhook really came from MobilePay.
 *
 * MobilePay signs `POST\n<path and query>\n<x-ms-date>;<host>;<x-ms-content-sha256>`
 * with HMAC-SHA256 under the secret it handed back when the webhook was
 * registered, and the content hash is the body's own SHA-256. Host, path and
 * query are taken from the URL the webhook was registered with, not from the
 * request: behind Cloud Functions' front end the path the function sees is
 * not the one MobilePay called.
 *
 * https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/request-authentication/
 */
export function verifyMobilePaySignature(input: {
  secret: string;
  webhookUrl: string;
  rawBody: Buffer;
  headers: Record<string, string | string[] | undefined>;
}): boolean {
  const header = (name: string): string | undefined => {
    const value = input.headers[name];
    return typeof value === 'string' ? value : undefined;
  };
  const date = header('x-ms-date');
  const contentHash = header('x-ms-content-sha256');
  const authorization = header('authorization');
  if (!date || !contentHash || !authorization) return false;

  const bodyHash = createHash('sha256').update(input.rawBody).digest('base64');
  if (!equal(bodyHash, contentHash)) return false;

  const url = new URL(input.webhookUrl);
  const toSign = `POST\n${url.pathname}${url.search}\n${date};${url.host};${contentHash}`;
  const signature = createHmac('sha256', input.secret).update(toSign).digest('base64');
  return equal(
    authorization,
    `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
  );
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Acts on one verified event.
 *
 * Activation upgrades the shop even if the owner never made it back to the
 * app — MobilePay warns its redirect is unreliable. A stopped or expired
 * agreement, or a charge that failed after its retries, puts the shop back
 * on free, the same as Stripe's `customer.subscription.deleted` and
 * `invoice.payment_failed`.
 */
export async function performMobilePayWebhookEvent(
  firestore: Firestore,
  api: MobilePayApi,
  event: MobilePayEvent,
): Promise<void> {
  switch (event.eventType) {
    case 'recurring.agreement-activated.v1':
      await activate(firestore, api, event.agreementId);
      return;
    case 'recurring.agreement-stopped.v1':
    case 'recurring.agreement-expired.v1':
      await downgradeAgreement(firestore, event.agreementId, event.eventType);
      return;
    case 'recurring.charge-failed.v1':
      // A failed month ends the subscription, and the agreement with it, so
      // nothing is left active in the owner's app that we no longer charge.
      if (await downgradeAgreement(firestore, event.agreementId, event.eventType)) {
        await api.stopAgreement(event.agreementId);
      }
      return;
    case 'recurring.charge-creation-failed.v1':
      // The charging run already treats a refused charge; this is the async
      // variant, worth a person's attention but not a downgrade on its own.
      logger.error('MobilePay: charge could not be created', event);
      return;
    default:
      logger.info('MobilePay webhook: ignored event', { eventType: event.eventType });
  }
}

async function activate(firestore: Firestore, api: MobilePayApi, agreementId: string) {
  const sessions = await firestore
    .collection('billingSessions')
    .where('agreementId', '==', agreementId)
    .limit(1)
    .get();
  const session = sessions.docs[0]?.data() as MobilePayBillingSession | undefined;
  if (!session) {
    logger.warn('MobilePay webhook: no checkout for agreement', { agreementId });
    return;
  }
  // Asked rather than taken from the event: a late or replayed activation
  // must not revive an agreement that has since been stopped.
  const { status } = await api.getAgreement(agreementId);
  if (status !== 'ACTIVE') return;

  await applyPlanChange(
    firestore,
    { shopId: session.shopId, plan: 'paid', mobilePayAgreementId: agreementId },
    'mobilepay',
  );
}

/**
 * Puts the shop charged on this agreement back on free. Returns whether it
 * did — false for an agreement no active subscription is on, such as one
 * the owner already cancelled from the app, or an older one since replaced.
 */
export async function downgradeAgreement(
  firestore: Firestore,
  agreementId: string,
  reason: string,
): Promise<boolean> {
  const matches = await firestore
    .collection('subscriptions')
    .where('agreementId', '==', agreementId)
    .limit(1)
    .get();
  const doc = matches.docs[0];
  const subscription = doc?.data() as MobilePaySubscription | undefined;
  if (!doc || subscription?.status !== 'active') return false;

  const shop = await firestore.doc(`shops/${doc.id}`).get();
  if (!shop.exists) {
    // Deleted out from under its subscription. Nothing to downgrade, but the
    // charging run must stop seeing it.
    await doc.ref.update({ status: 'stopped', nextChargeDue: null });
    return true;
  }

  await applyPlanChange(firestore, { shopId: doc.id, plan: 'free' }, 'mobilepay');
  logger.info('MobilePay: subscription ended', { shopId: doc.id, agreementId, reason });
  return true;
}

/**
 * The raw HTTP endpoint MobilePay posts to.
 *
 * `onRequest`, not `onCall`, for the same reason as `stripeWebhook`:
 * MobilePay is not a signed-in user, and its HMAC signature is the only
 * authentication this endpoint has. Registered once with
 * `functions/scripts/mobilepay-webhook.mjs`.
 */
export const mobilepayWebhook = onRequest(
  { secrets: MOBILEPAY_WEBHOOK_SECRETS_IF_ENABLED },
  async (request: Request, response: Response) => {
    const secret = process.env['MOBILEPAY_WEBHOOK_SECRET'];
    const webhookUrl = process.env['MOBILEPAY_WEBHOOK_URL'];
    if (!secret || !webhookUrl) {
      response.status(500).send('Webhook not configured.');
      return;
    }

    if (
      !verifyMobilePaySignature({
        secret,
        webhookUrl,
        rawBody: request.rawBody,
        headers: request.headers,
      })
    ) {
      logger.warn('MobilePay webhook: bad signature');
      response.status(401).send('Invalid signature.');
      return;
    }

    const event = JSON.parse(request.rawBody.toString('utf8')) as MobilePayEvent;
    await performMobilePayWebhookEvent(db, mobilePayApi(mobilePayConfigFromEnv()), event);
    response.status(200).send('ok');
  },
);
