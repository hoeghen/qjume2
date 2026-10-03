import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDoc } from '../../lib/hooks/useFirestore.js';
import { shopDoc } from '../../lib/firestore/paths.js';
import { completeCheckout, messageOf, startCheckout } from '../../lib/functions.js';
import { SUBSCRIPTION_PRICE_DKK } from '../../types/index.js';
import {
  freeServicesGranted,
  freeServicesRemaining,
  servicesUsed,
} from '../../lib/freeServices.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { useShopContext } from './ShopHome.js';

export function Billing() {
  const { t } = useT();
  const { shopId } = useShopContext();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const shop = useDoc(shopDoc(shopId));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Returning from the provider. The session id is a lookup key, not proof —
  // the server asks the provider whether it was really paid.
  const session = params.get('session');
  useEffect(() => {
    if (!session) return;
    setBusy(true);
    completeCheckout({ sessionId: session })
      .then(() => navigate('/shop/billing', { replace: true }))
      .catch((e: unknown) => setError(messageOf(e)))
      .finally(() => setBusy(false));
  }, [session, navigate]);

  if (shop.loading) return <p className="panel">{t('common.loading')}</p>;
  if (!shop.data) return <p className="panel">{t('shop.billing.shopNotFound')}</p>;

  const paid = shop.data.plan === 'paid';

  function changePlan(plan: 'free' | 'paid') {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const { url } = await startCheckout({ shopId, plan });
        // An absolute URL is a real provider's own hosted page — the whole
        // page is about to unload, so nothing here needs to run again. A
        // relative one (the stub, or a Stripe cancellation, which has no
        // checkout page to send anyone to) stays on this route, same path or
        // not, and nothing else is left to flip `busy` back.
        if (url.startsWith('http')) {
          window.location.assign(url);
        } else {
          navigate(url.replace('/shop/billing/return', '/shop/billing'));
          setBusy(false);
        }
      } catch (e) {
        setError(messageOf(e));
        setBusy(false);
      }
    })();
  }

  return (
    <main className="panel">
      <h1>{t('shop.billing.title')}</h1>
      <p className="muted">
        {t('shop.billing.onPlanBefore')}
        <strong>{paid ? t('shop.billing.planPaid') : t('shop.billing.planFree')}</strong>
        {t('shop.billing.onPlanAfter')}
      </p>

      {!paid && (
        <>
          {/* The free plan is the whole app, for a number of services. */}
          <p>
            {t('shop.billing.freeLeft', {
              left: freeServicesRemaining(shop.data),
              of: freeServicesGranted(shop.data),
            })}
          </p>
          {freeServicesRemaining(shop.data) === 0 && (
            <p className="notice warn" role="status">
              {t('shop.billing.usedUp')}
            </p>
          )}
          <h2>{t('shop.billing.subscriptionTitle')}</h2>
          <p>{t('shop.billing.subscriptionBody', { price: SUBSCRIPTION_PRICE_DKK })}</p>
          <button type="button" disabled={busy} onClick={() => changePlan('paid')}>
            {t('shop.billing.subscribe', { price: SUBSCRIPTION_PRICE_DKK })}
          </button>
          <p className="hint">
            {t('shop.billing.subscriptionHintBefore')}
            <LocalizedLink to="/terms">{t('shop.billing.terms')}</LocalizedLink>
            {t('shop.billing.subscriptionHintAfter')}
          </p>
        </>
      )}

      {paid && (
        <p>
          {t('shop.billing.paidSummary', {
            price: SUBSCRIPTION_PRICE_DKK,
            served: servicesUsed(shop.data),
          })}
        </p>
      )}

      {paid && (
        <>
          <h2>{t('shop.billing.leavingTitle')}</h2>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => changePlan('free')}
          >
            {t('shop.billing.moveToFree')}
          </button>
        </>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
