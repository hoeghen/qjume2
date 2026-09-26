import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { shopDoc } from '../../lib/firestore/paths.js';
import {
  addStaff,
  completeCheckout,
  messageOf,
  removeStaff,
  startCheckout,
} from '../../lib/functions.js';
import { staffOf } from '../../lib/firestore/queries.js';
import { FREE_TIER_LIMITS } from '../../types/index.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { useShopContext } from './ShopHome.js';

const PAID_FEATURE_KEYS = [
  'moreQueues',
  'severalTills',
  'staffLimited',
  'analytics',
  'branding',
  'descriptions',
  'sms',
] as const;

export function Billing() {
  const { t } = useT();
  const { shopId } = useShopContext();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const shop = useDoc(shopDoc(shopId));
  const { data: staff } = useCollection(staffOf(shopId), `${shopId}/staff`);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

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
        // relative one (the stub, the mock, or a Stripe cancellation, which
        // has no checkout page to send anyone to) stays on this route, same
        // path or not, and nothing else is left to flip `busy` back.
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

  function invite(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        await addStaff({ shopId, email: trimmed });
        setEmail('');
      } catch (e) {
        setError(messageOf(e));
      } finally {
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
          <p>{t('shop.billing.freeSummary', { n: FREE_TIER_LIMITS.maxWaiting })}</p>
          <h2>{t('shop.billing.paidFeaturesTitle')}</h2>
          <ul className="feature-list">
            {PAID_FEATURE_KEYS.map((f) => (
              <li key={f}>{t(`shop.billing.features.${f}`)}</li>
            ))}
          </ul>
          <button type="button" disabled={busy} onClick={() => changePlan('paid')}>
            {t('shop.billing.upgrade')}
          </button>
          <p className="hint">
            {t('shop.billing.subscriptionHintBefore')}
            <LocalizedLink to="/terms">{t('shop.billing.terms')}</LocalizedLink>
            {t('shop.billing.subscriptionHintAfter')}
          </p>
        </>
      )}

      {paid && (
        <>
          <h2>{t('shop.billing.staffTitle')}</h2>
          <p className="hint">{t('shop.billing.staffHint')}</p>
          <ul className="queue-list">
            {staff?.map((member) => (
              <li key={member.id}>
                <span>{member.email ?? member.id}</span>
                <button
                  type="button"
                  className="link danger"
                  disabled={busy}
                  onClick={() =>
                    void removeStaff({ shopId, uid: member.id }).catch((e: unknown) =>
                      setError(messageOf(e)),
                    )
                  }
                >
                  {t('shop.billing.remove')}
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={invite} className="stack">
            <label htmlFor="staff-email">{t('shop.billing.addStaffLabel')}</label>
            <input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="hint">{t('shop.billing.addStaffHint')}</p>
            <button type="submit" disabled={busy}>
              {t('shop.billing.add')}
            </button>
          </form>

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
