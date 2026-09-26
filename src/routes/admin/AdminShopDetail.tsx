import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { shopDoc } from '../../lib/firestore/paths.js';
import { queuesOf } from '../../lib/firestore/queries.js';
import {
  adminUpdateShop,
  messageOf,
  reinstateShop,
  suspendShop,
} from '../../lib/functions.js';
import { DeleteShopDialog } from '../shop/components/DeleteShopDialog.js';
import type { QueueStatus } from '../../types/index.js';

const STATUS_LABELS: Record<QueueStatus, string> = {
  open: 'Open',
  drainMode: 'Closing — walk-ins only',
  paused: 'Paused',
  unavailable: 'Offline',
  closed: 'Closed',
};

/**
 * One shop, fully in an admin's hands: edit its settings, suspend or
 * reinstate it platform-wide, delete it outright, and reach every one of its
 * queues to edit them or open their live monitor.
 */
export function AdminShopDetail() {
  const { shopId = '' } = useParams();
  const navigate = useNavigate();
  const shop = useDoc(shopId ? shopDoc(shopId) : null);
  const { data: queuesList, loading: queuesLoading } = useCollection(
    shopId ? queuesOf(shopId) : null,
    `admin/${shopId}/queues`,
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopSaved, setShopSaved] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (shop.loading) return <p className="panel">Loading…</p>;
  const s = shop.data;
  if (!s) return <p className="panel">This shop no longer exists.</p>;

  const suspended = s.suspended;
  function toggleSuspension() {
    setBusy(true);
    setError(null);
    void (suspended ? reinstateShop({ shopId }) : suspendShop({ shopId }))
      .catch((e: unknown) => setError(messageOf(e)))
      .finally(() => setBusy(false));
  }

  function onSaveShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '');
    const exclusiveQueues = form.get('exclusiveQueues') === 'on';
    const logo = String(form.get('logo') ?? '').trim() || null;
    const hours = String(form.get('hours') ?? '').trim() || null;
    const phone = String(form.get('phone') ?? '').trim() || null;
    const description = String(form.get('description') ?? '').trim() || null;
    const hasProfile = logo || hours || phone || description;

    setBusy(true);
    setError(null);
    setShopSaved(false);
    void adminUpdateShop({
      shopId,
      name,
      exclusiveQueues,
      profile: hasProfile ? { logo, hours, phone, description } : null,
    })
      .then(() => setShopSaved(true))
      .catch((e: unknown) => setError(messageOf(e)))
      .finally(() => setBusy(false));
  }

  return (
    <main className="panel">
      <p>
        <Link className="link" to="/admin">
          ← All shops
        </Link>
      </p>

      <header className="serving-header">
        <h1>{s.name}</h1>
        {/* Not a status colour: the plan is neither good nor bad news, so it
            gets the plain badge, with the paid tier picked out by the one
            solid fill the badge set has (drainMode's), not the stop colour a
            queue-status badge would otherwise reach for. */}
        <span className={`badge${s.plan === 'paid' ? ' status-drainMode' : ''}`}>
          {s.plan}
        </span>
        {s.suspended && <span className="badge status-closed">Suspended</span>}
      </header>
      <p className="muted">Owner: {s.ownerUid}</p>

      <div className="row tight">
        <button type="button" disabled={busy} onClick={toggleSuspension}>
          {s.suspended ? 'Reinstate shop' : 'Suspend shop'}
        </button>
        <button
          type="button"
          className="danger"
          disabled={busy}
          onClick={() => setShowDelete(true)}
        >
          Delete shop
        </button>
      </div>
      {s.suspended && (
        <p className="hint">
          Every queue below is hidden from discovery and refusing new
          joiners, whatever its own status says. Staff can still serve
          anyone already waiting.
        </p>
      )}

      <h2>Edit shop</h2>
      <form onSubmit={onSaveShop} className="stack">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" defaultValue={s.name} required />

        <label className="row tight">
          <input
            type="checkbox"
            name="exclusiveQueues"
            defaultChecked={s.exclusiveQueues}
          />
          One ticket per customer across all of this shop&rsquo;s queues
        </label>

        <label htmlFor="hours">Hours (optional)</label>
        <input id="hours" name="hours" defaultValue={s.profile?.hours ?? ''} />

        <label htmlFor="phone">Phone (optional)</label>
        <input id="phone" name="phone" defaultValue={s.profile?.phone ?? ''} />

        <label htmlFor="logo">Logo URL (optional)</label>
        <input id="logo" name="logo" defaultValue={s.profile?.logo ?? ''} />

        <label htmlFor="description">Description (optional)</label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={s.profile?.description ?? ''}
        />

        <div className="row">
          <button type="submit" disabled={busy}>
            Save
          </button>
        </div>
      </form>

      {shopSaved && (
        <p className="notice" role="status">
          Shop saved.
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <h2>
        {queuesList?.length ?? 0} {queuesList?.length === 1 ? 'queue' : 'queues'}
      </h2>
      {queuesLoading && <p>Loading…</p>}
      <ul className="queue-list">
        {queuesList?.map((q) => (
          <li key={q.id}>
            <div>
              <strong>{q.name}</strong>
              <span className={`badge status-${q.status}`}>
                {STATUS_LABELS[q.status]}
              </span>
              <p className="muted">
                {q.waitingCount} waiting · {q.address}
              </p>
            </div>
            <span className="row tight">
              <Link className="link" to={`/admin/shops/${shopId}/q/${q.id}`}>
                Edit
              </Link>
              <Link className="link" to={`/monitor?shop=${shopId}&queue=${q.id}`}>
                Monitor
              </Link>
            </span>
          </li>
        ))}
      </ul>

      {showDelete && (
        <DeleteShopDialog
          shopId={shopId}
          shopName={s.name}
          onClose={() => setShowDelete(false)}
          onDeleted={() => navigate('/admin')}
        />
      )}
    </main>
  );
}
