import { createHash } from 'node:crypto';
import type {
  CheckoutSession,
  CompletedCheckout,
  PaymentProvider,
} from './provider.js';
import type { Plan } from '../../../src/types/index.js';

/**
 * A provider that takes no money.
 *
 * Lets the upgrade path be exercised end to end — checkout, return, plan
 * change — without a payment account. Sessions are signed with a secret so a
 * test still cannot mint one for an arbitrary shop, which keeps the tests
 * honest about the thing that matters: a plan changes only on a session the
 * provider vouches for.
 *
 * Never selected implicitly in production; `providerFromEnv` requires it by
 * name.
 */
export function stubPayments(secret = 'stub-secret'): PaymentProvider {
  const sign = (shopId: string, plan: Plan) =>
    createHash('sha256').update(`${secret}:${shopId}:${plan}`).digest('hex').slice(0, 32);

  return {
    name: 'stub',
    async createCheckout(shopId: string, plan: Plan): Promise<CheckoutSession> {
      const sessionId = `stub_${shopId}_${plan}_${sign(shopId, plan)}`;
      return { url: `/shop/billing/return?session=${sessionId}`, sessionId };
    },
    async verifyCheckout(sessionId: string): Promise<CompletedCheckout | null> {
      const match = /^stub_(.+)_(free|paid)_([0-9a-f]{32})$/.exec(sessionId);
      if (!match) return null;
      const [, shopId, plan, signature] = match as unknown as [
        string,
        string,
        Plan,
        string,
      ];
      // A forged session id fails here, exactly as an unknown one would at a
      // real provider.
      if (signature !== sign(shopId, plan)) return null;
      return { shopId, plan };
    },
  };
}
