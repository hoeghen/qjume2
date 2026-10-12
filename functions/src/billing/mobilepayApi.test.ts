import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { mobilePayApi, mobilePayConfigFromEnv, type MobilePayConfig } from './mobilepayApi.js';
import { verifyMobilePaySignature } from './mobilepayWebhook.js';
import { nextMonthlyDue } from './applyPlan.js';

describe('the MobilePay API client', () => {
  const config: MobilePayConfig = {
    clientId: `client-${Math.random()}`,
    clientSecret: 'secret',
    subscriptionKey: 'sub-key',
    merchantSerialNumber: '123456',
    environment: 'test',
  };

  function recordingFetch() {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const body = url.endsWith('/accesstoken/get')
        ? { access_token: 'tok', expires_in: '3600' }
        : { agreementId: 'agr_1', vippsConfirmationUrl: 'https://pay', status: 'ACTIVE' };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;
    return { calls, fetchImpl };
  }

  it('authenticates once and reuses the token', async () => {
    const { calls, fetchImpl } = recordingFetch();
    const api = mobilePayApi(config, fetchImpl);
    await api.getAgreement('agr_1');
    await api.getAgreement('agr_1');

    expect(calls.map((c) => c.url)).toEqual([
      'https://apitest.vipps.no/accesstoken/get',
      'https://apitest.vipps.no/recurring/v3/agreements/agr_1',
      'https://apitest.vipps.no/recurring/v3/agreements/agr_1',
    ]);
    expect(calls[0]!.init.headers).toMatchObject({
      client_id: config.clientId,
      client_secret: 'secret',
      'Ocp-Apim-Subscription-Key': 'sub-key',
    });
    expect(calls[1]!.init.headers).toMatchObject({
      Authorization: 'Bearer tok',
      'Merchant-Serial-Number': '123456',
    });
  });

  it('creates a monthly DKK agreement with the first month charged up front', async () => {
    const { calls, fetchImpl } = recordingFetch();
    await mobilePayApi({ ...config, clientId: `c-${Math.random()}` }, fetchImpl).createAgreement({
      amount: 12500,
      productName: 'Qjume abonnement',
      initialChargeDescription: 'first',
      merchantRedirectUrl: 'https://qjume.dk/r',
      merchantAgreementUrl: 'https://qjume.dk/a',
    });
    const call = calls[1]!;
    expect(call.init.method).toBe('POST');
    expect(JSON.parse(call.init.body as string)).toEqual({
      pricing: { type: 'LEGACY', amount: 12500, currency: 'DKK' },
      interval: { unit: 'MONTH', count: 1 },
      merchantRedirectUrl: 'https://qjume.dk/r',
      merchantAgreementUrl: 'https://qjume.dk/a',
      productName: 'Qjume abonnement',
      initialCharge: { amount: 12500, description: 'first', transactionType: 'DIRECT_CAPTURE' },
    });
    expect((call.init.headers as Record<string, string>)['Idempotency-Key']).toBeTruthy();
  });

  it("uses a charge's order id as its idempotency key", async () => {
    const { calls, fetchImpl } = recordingFetch();
    await mobilePayApi({ ...config, clientId: `c-${Math.random()}` }, fetchImpl).createCharge(
      'agr_1',
      { amount: 12500, description: 'd', due: '2026-11-01', orderId: 'qjume-s-20261101' },
    );
    expect((calls[1]!.init.headers as Record<string, string>)['Idempotency-Key']).toBe(
      'qjume-s-20261101',
    );
  });

  it('names the missing setting rather than failing later', () => {
    expect(() => mobilePayConfigFromEnv({})).toThrow(/MOBILEPAY_CLIENT_ID/);
  });
});

describe('MobilePay webhook signatures', () => {
  const secret = 'whsec';
  const webhookUrl = 'https://europe-west1-qjume.cloudfunctions.net/mobilepayWebhook';
  const rawBody = Buffer.from('{"eventType":"recurring.agreement-stopped.v1"}');

  function signed(body = rawBody) {
    const date = 'Mon, 12 Oct 2026 10:00:00 GMT';
    const contentHash = createHash('sha256').update(body).digest('base64');
    const toSign = `POST\n/mobilepayWebhook\n${date};europe-west1-qjume.cloudfunctions.net;${contentHash}`;
    const signature = createHmac('sha256', secret).update(toSign).digest('base64');
    return {
      'x-ms-date': date,
      'x-ms-content-sha256': contentHash,
      authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
    };
  }

  it('accepts a request MobilePay signed', () => {
    expect(verifyMobilePaySignature({ secret, webhookUrl, rawBody, headers: signed() })).toBe(true);
  });

  it('rejects a body changed after signing', () => {
    expect(
      verifyMobilePaySignature({
        secret,
        webhookUrl,
        rawBody: Buffer.from('{"eventType":"recurring.agreement-activated.v1"}'),
        headers: signed(),
      }),
    ).toBe(false);
  });

  it('rejects the wrong secret, and a missing signature', () => {
    expect(
      verifyMobilePaySignature({ secret: 'other', webhookUrl, rawBody, headers: signed() }),
    ).toBe(false);
    expect(verifyMobilePaySignature({ secret, webhookUrl, rawBody, headers: {} })).toBe(false);
  });
});

describe('monthly due dates', () => {
  it('keep the day of the month', () => {
    expect(nextMonthlyDue('2026-10-12', 12)).toBe('2026-11-12');
    expect(nextMonthlyDue('2026-12-12', 12)).toBe('2027-01-12');
  });

  it('fall on the last day of a shorter month, then go back', () => {
    expect(nextMonthlyDue('2026-01-31', 31)).toBe('2026-02-28');
    expect(nextMonthlyDue('2026-02-28', 31)).toBe('2026-03-31');
  });
});
