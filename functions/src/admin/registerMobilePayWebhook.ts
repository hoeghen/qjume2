import { onCall } from 'firebase-functions/v2/https';
import type { Firestore } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { requirePlatformAdmin, type AdminCaller } from '../lib/auth.js';
import { fail } from '../lib/errors.js';
import { MOBILEPAY_SECRETS_IF_ENABLED } from '../lib/secrets.js';
import {
  MOBILEPAY_WEBHOOK_EVENTS,
  mobilePayApi,
  mobilePayConfigFromEnv,
  type MobilePayApi,
} from '../billing/mobilepayApi.js';
import { logAdminAction } from './auditLog.js';

export interface RegisterMobilePayWebhookResult {
  webhookId: string;
  /** Shown to the admin once, to store as `MOBILEPAY_WEBHOOK_SECRET`. Never logged. */
  secret: string;
  url: string;
  environment: 'test' | 'production';
  /** Earlier registrations for the same URL, removed so MobilePay calls it once. */
  replaced: number;
}

/**
 * Registers `mobilepayWebhook` with MobilePay, from the admin console.
 *
 * Exists so this needs no command line: it runs where the MobilePay keys
 * already are. Done once per environment — test now, production when going
 * live. Any earlier registration for the same URL is deleted first: two
 * would mean every event arriving twice, one of them signed with a secret
 * the function no longer has. CLAUDE.md decision 19.
 */
export async function performRegisterMobilePayWebhook(
  firestore: Firestore,
  caller: AdminCaller,
  api: MobilePayApi,
  webhookUrl: string | undefined,
  environment: 'test' | 'production',
): Promise<RegisterMobilePayWebhookResult> {
  if (!webhookUrl) {
    throw fail(
      'failed-precondition',
      'payments-not-configured',
      'MOBILEPAY_WEBHOOK_URL is not set in functions/.env.qjume-d483a.',
    );
  }

  const existing = (await api.listWebhooks()).filter((w) => w.url === webhookUrl);
  for (const webhook of existing) await api.deleteWebhook(webhook.id);

  const { id, secret } = await api.registerWebhook(webhookUrl, MOBILEPAY_WEBHOOK_EVENTS);

  // No transaction to join: the change happened at MobilePay, not here.
  await logAdminAction(firestore, null, {
    action: 'billing.registerWebhook',
    adminUid: caller.uid,
    adminEmail: caller.email,
    shopId: '',
    summary: `Registered the MobilePay webhook (${environment})`,
  });

  return { webhookId: id, secret, url: webhookUrl, environment, replaced: existing.length };
}

export const adminRegisterMobilePayWebhook = onCall<
  void,
  Promise<RegisterMobilePayWebhookResult>
>({ secrets: MOBILEPAY_SECRETS_IF_ENABLED }, (request) => {
  const caller = requirePlatformAdmin(request);
  const config = mobilePayConfigFromEnv();
  return performRegisterMobilePayWebhook(
    db,
    caller,
    mobilePayApi(config),
    process.env['MOBILEPAY_WEBHOOK_URL'],
    config.environment,
  );
});
