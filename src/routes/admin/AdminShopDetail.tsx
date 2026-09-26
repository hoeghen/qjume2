import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { shopDoc } from '../../lib/firestore/paths.js';
import { queuesOf } from '../../lib/firestore/queries.js';
import {
  adminUpdateShop,
  messageOf,
  reinstateShop,
  suspendShop,
} from '../../lib/functions.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { DeleteShopDialog } from '../shop/components/DeleteShopDialog.js';

/**
 * One shop, fully in an admin's hands: edit its settings, suspend or
 * reinstate it platform-wide, delete it outright, and reach every one of its
 * queues to edit them or open their live monitor.
 */
export function AdminShopDetail() {
  const { t, tn } = useT();
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

  if (shop.loading) return <p className="panel">{t('common.loading')}</p>;
  const s = shop.data;
  if (!s) return <p className="panel">{t('shopQueues.shopGone')}</p>;

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
        <LocalizedLink className="link" to="/admin">
          {t('admin.shopDetail.allShops')}
        </LocalizedLink>
      </p>

      <header className="serving-header">
        <h1>{s.name}</h1>
        {/* Not a status colour: the plan is neither good nor bad news, so it
            gets the plain badge, with the paid tier picked out by the one
            solid fill the badge set has (drainMode's), not the stop colour a
            queue-status badge would otherwise reach for. */}
        <span className={`badge${s.plan === 'paid' ? ' status-drainMode' : ''}`}>
          {t(`admin.planLabel.${s.plan}`)}
        </span>
        {s.suspended && <span className="badge status-closed">{t('admin.shopList.suspended')}</span>}
      </header>
      <p className="muted">{t('admin.shopDetail.owner', { uid: s.ownerUid })}</p>

      <div className="row tight">
        <button type="button" disabled={busy} onClick={toggleSuspension}>
          {s.suspended ? t('admin.shopDetail.reinstate') : t('admin.shopDetail.suspend')}
        </button>
        <button
          type="button"
          className="danger"
          disabled={busy}
          onClick={() => setShowDelete(true)}
        >
          {t('admin.shopDetail.delete')}
        </button>
      </div>
      {s.suspended && <p className="hint">{t('admin.shopDetail.suspendedHint')}</p>}

      <h2>{t('admin.shopDetail.editShop')}</h2>
      <form onSubmit={onSaveShop} className="stack">
        <label htmlFor="name">{t('admin.shopDetail.nameLabel')}</label>
        <input id="name" name="name" defaultValue={s.name} required />

        <label className="row tight">
          <input
            type="checkbox"
            name="exclusiveQueues"
            defaultChecked={s.exclusiveQueues}
          />
          {t('admin.shopDetail.exclusiveLabel')}
        </label>

        <label htmlFor="hours">{t('admin.shopDetail.hoursLabel')}</label>
        <input id="hours" name="hours" defaultValue={s.profile?.hours ?? ''} />

        <label htmlFor="phone">{t('admin.shopDetail.phoneLabel')}</label>
        <input id="phone" name="phone" defaultValue={s.profile?.phone ?? ''} />

        <label htmlFor="logo">{t('admin.shopDetail.logoLabel')}</label>
        <input id="logo" name="logo" defaultValue={s.profile?.logo ?? ''} />

        <label htmlFor="description">{t('admin.shopDetail.descriptionLabel')}</label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={s.profile?.description ?? ''}
        />

        <div className="row">
          <button type="submit" disabled={busy}>
            {t('common.save')}
          </button>
        </div>
      </form>

      {shopSaved && (
        <p className="notice" role="status">
          {t('admin.shopDetail.shopSaved')}
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <h2>{tn(queuesList?.length ?? 0, 'admin.shopDetail.queuesHeading')}</h2>
      {queuesLoading && <p>{t('common.loading')}</p>}
      <ul className="queue-list">
        {queuesList?.map((q) => (
          <li key={q.id}>
            <div>
              <strong>{q.name}</strong>
              <span className={`badge status-${q.status}`}>
                {t(`shopQueueStatus.${q.status}`)}
              </span>
              <p className="muted">
                {t('admin.shopDetail.waitingAddress', { count: q.waitingCount, address: q.address })}
              </p>
            </div>
            <span className="row tight">
              <LocalizedLink className="link" to={`/admin/shops/${shopId}/q/${q.id}`}>
                {t('admin.shopDetail.edit')}
              </LocalizedLink>
              <LocalizedLink className="link" to={`/monitor?shop=${shopId}&queue=${q.id}`}>
                {t('admin.shopDetail.monitor')}
              </LocalizedLink>
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
