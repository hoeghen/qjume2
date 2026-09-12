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
import { useShopContext } from './ShopHome.js';

const PAID_FEATURES = [
  'More than one queue',
  'Several tills serving at once',
  'Staff who can serve but not change settings',
  'Analytics — wait times, busiest hours, people served',
  'A shop profile and your own branding',
  'Queue descriptions and a message on joining',
  'Text messages as well as email',
];

export function Billing() {
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

  if (shop.loading) return <p className="panel">Loading…</p>;
  if (!shop.data) return <p className="panel">Shop not found.</p>;

  const paid = shop.data.plan === 'paid';

  function changePlan(plan: 'free' | 'paid') {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const { url } = await startCheckout({ shopId, plan });
        // Relative while no provider is configured; a real one returns its own
        // hosted page.
        if (url.startsWith('http')) window.location.assign(url);
        else navigate(url.replace('/shop/billing/return', '/shop/billing'));
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
      <h1>Plan</h1>
      <p className="muted">
        You are on the <strong>{paid ? 'paid' : 'free'}</strong> plan.
      </p>

      {!paid && (
        <>
          <p>
            The free plan covers one queue, one person serving, and about{' '}
            {FREE_TIER_LIMITS.maxWaiting} people waiting at a time.
          </p>
          <h2>The paid plan adds</h2>
          <ul className="feature-list">
            {PAID_FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <button type="button" disabled={busy} onClick={() => changePlan('paid')}>
            Upgrade
          </button>
        </>
      )}

      {paid && (
        <>
          <h2>Staff</h2>
          <p className="hint">
            Staff can serve a queue. They cannot change settings or see this
            page.
          </p>
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
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={invite} className="stack">
            <label htmlFor="staff-email">Add someone by email</label>
            <input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="hint">
              They need to have signed in to Qjume at least once.
            </p>
            <button type="submit" disabled={busy}>
              Add
            </button>
          </form>

          <h2>Leaving the paid plan</h2>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => changePlan('free')}
          >
            Move to the free plan
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
