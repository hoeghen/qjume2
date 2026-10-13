import { randomUUID } from 'node:crypto';

/**
 * The slice of Vipps MobilePay's Recurring API (v3) this app uses, behind an
 * interface so the provider, webhook and charging run can be tested against
 * a fake rather than MobilePay's test environment.
 *
 * https://developer.vippsmobilepay.com/docs/APIs/recurring-api/
 */
export type AgreementStatus = 'PENDING' | 'ACTIVE' | 'STOPPED' | 'EXPIRED';

export interface CreateAgreementRequest {
  /** Minor units: øre. */
  amount: number;
  productName: string;
  initialChargeDescription: string;
  merchantRedirectUrl: string;
  merchantAgreementUrl: string;
}

export interface CreateChargeRequest {
  /** Minor units: øre. */
  amount: number;
  description: string;
  /** `YYYY-MM-DD`, at least one day ahead. */
  due: string;
  /**
   * Our own id for the charge. Unique per merchant, so the same period can
   * never be charged twice — also sent as the idempotency key.
   */
  orderId: string;
}

/** The Recurring API events `mobilepayWebhook` acts on or logs. */
export const MOBILEPAY_WEBHOOK_EVENTS = [
  'recurring.agreement-activated.v1',
  'recurring.agreement-stopped.v1',
  'recurring.agreement-expired.v1',
  'recurring.charge-failed.v1',
  'recurring.charge-creation-failed.v1',
];

export interface RegisteredWebhook {
  id: string;
  url: string;
}

export interface MobilePayApi {
  createAgreement(
    request: CreateAgreementRequest,
  ): Promise<{ agreementId: string; vippsConfirmationUrl: string }>;
  getAgreement(agreementId: string): Promise<{ status: AgreementStatus }>;
  /** Idempotent: stopping a stopped agreement succeeds. */
  stopAgreement(agreementId: string): Promise<void>;
  createCharge(agreementId: string, request: CreateChargeRequest): Promise<void>;
  listWebhooks(): Promise<RegisteredWebhook[]>;
  /** Returns the secret MobilePay signs this webhook's deliveries with — shown once. */
  registerWebhook(url: string, events: string[]): Promise<{ id: string; secret: string }>;
  deleteWebhook(id: string): Promise<void>;
}

export interface MobilePayConfig {
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  merchantSerialNumber: string;
  /** `test` talks to apitest.vipps.no; anything else is production. */
  environment: 'test' | 'production';
}

export class MobilePayApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    what: string,
  ) {
    super(`MobilePay ${what} failed with ${status}: ${body.slice(0, 500)}`);
  }
}

/** Reads the config from the environment, naming the first thing missing. */
export function mobilePayConfigFromEnv(env = process.env): MobilePayConfig {
  const need = (name: string): string => {
    const value = env[name];
    if (!value) {
      throw new Error(`${name} is required for the mobilepay payments provider.`);
    }
    return value;
  };
  return {
    clientId: need('MOBILEPAY_CLIENT_ID'),
    clientSecret: need('MOBILEPAY_CLIENT_SECRET'),
    subscriptionKey: need('MOBILEPAY_SUBSCRIPTION_KEY'),
    merchantSerialNumber: need('MOBILEPAY_MSN'),
    environment: env['MOBILEPAY_ENV'] === 'production' ? 'production' : 'test',
  };
}

export function mobilePayBaseUrl(environment: MobilePayConfig['environment']): string {
  return environment === 'production' ? 'https://api.vipps.no' : 'https://apitest.vipps.no';
}

type Fetch = typeof fetch;

/**
 * Access tokens last an hour in the test environment and a day in
 * production, and may be reused for all of it — so one per warm instance,
 * not one per request.
 */
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export function mobilePayApi(config: MobilePayConfig, fetchImpl: Fetch = fetch): MobilePayApi {
  const base = mobilePayBaseUrl(config.environment);

  const commonHeaders = {
    'Ocp-Apim-Subscription-Key': config.subscriptionKey,
    'Merchant-Serial-Number': config.merchantSerialNumber,
    'Vipps-System-Name': 'qjume',
    'Vipps-System-Version': '1.0.0',
  };

  async function accessToken(): Promise<string> {
    const key = `${config.environment}:${config.clientId}`;
    const cached = tokenCache.get(key);
    // A minute's margin, so a token never expires between here and MobilePay.
    if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;

    const response = await fetchImpl(`${base}/accesstoken/get`, {
      method: 'POST',
      headers: {
        ...commonHeaders,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      },
    });
    if (!response.ok) {
      throw new MobilePayApiError(response.status, await response.text(), 'access token');
    }
    const body = (await response.json()) as { access_token: string; expires_in: number | string };
    tokenCache.set(key, {
      token: body.access_token,
      expiresAt: Date.now() + Number(body.expires_in) * 1000,
    });
    return body.access_token;
  }

  async function call(
    what: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      ...commonHeaders,
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
    };
    if (method !== 'GET') headers['Idempotency-Key'] = idempotencyKey ?? randomUUID();

    const response = await fetchImpl(`${base}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      throw new MobilePayApiError(response.status, await response.text(), what);
    }
    return response;
  }

  return {
    async createAgreement(request) {
      const response = await call('create agreement', 'POST', '/recurring/v3/agreements', {
        pricing: { type: 'LEGACY', amount: request.amount, currency: 'DKK' },
        interval: { unit: 'MONTH', count: 1 },
        merchantRedirectUrl: request.merchantRedirectUrl,
        merchantAgreementUrl: request.merchantAgreementUrl,
        productName: request.productName,
        // The first month is paid on accepting, so a shop is never on the
        // paid plan without having paid for it.
        initialCharge: {
          amount: request.amount,
          description: request.initialChargeDescription,
          transactionType: 'DIRECT_CAPTURE',
        },
      });
      return (await response.json()) as { agreementId: string; vippsConfirmationUrl: string };
    },

    async getAgreement(agreementId) {
      const response = await call(
        'get agreement',
        'GET',
        `/recurring/v3/agreements/${encodeURIComponent(agreementId)}`,
      );
      return (await response.json()) as { status: AgreementStatus };
    },

    async stopAgreement(agreementId) {
      await call(
        'stop agreement',
        'PATCH',
        `/recurring/v3/agreements/${encodeURIComponent(agreementId)}`,
        { status: 'STOPPED' },
      );
    },

    async createCharge(agreementId, request) {
      await call(
        'create charge',
        'POST',
        `/recurring/v3/agreements/${encodeURIComponent(agreementId)}/charges`,
        {
          amount: request.amount,
          description: request.description,
          due: request.due,
          retryDays: 2,
          transactionType: 'DIRECT_CAPTURE',
          type: 'RECURRING',
          orderId: request.orderId,
        },
        request.orderId,
      );
    },

    async listWebhooks() {
      const response = await call('list webhooks', 'GET', '/webhooks/v1/webhooks');
      const body = (await response.json()) as
        | RegisteredWebhook[]
        | { webhooks?: RegisteredWebhook[] };
      return Array.isArray(body) ? body : (body.webhooks ?? []);
    },

    async registerWebhook(url, events) {
      const response = await call('register webhook', 'POST', '/webhooks/v1/webhooks', {
        url,
        events,
      });
      return (await response.json()) as { id: string; secret: string };
    },

    async deleteWebhook(id) {
      await call('delete webhook', 'DELETE', `/webhooks/v1/webhooks/${encodeURIComponent(id)}`);
    },
  };
}
