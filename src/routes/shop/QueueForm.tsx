import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { queueDoc } from '../../lib/firestore/paths.js';
import { useDoc } from '../../lib/hooks/useFirestore.js';
import {
  adminUpdateQueue,
  createQueue,
  messageOf,
  updateQueue,
  type Geocoded,
} from '../../lib/functions.js';
import {
  QUEUE_CATEGORIES,
  type NoShowPenalty,
  type QueueCategory,
} from '../../types/index.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { AddressField } from '../../components/AddressField.js';

const PENALTIES: NoShowPenalty[] = ['back', 'back3', 'back5'];

/**
 * The owner's queue settings form, and (via `admin`) the platform admin's
 * edit of any queue.
 *
 * The two differ only in which function they call and where "done" goes —
 * `adminUpdateQueue` bypasses the owner check, and there is no admin path to
 * *create* a queue at all: the free-tier count it would have to respect is
 * counted in `createQueue`, which stays owner-only. `paid` is forced true in
 * admin mode so the description field isn't held behind a plan an admin
 * doing support work has no reason to care about.
 */
export function QueueForm({
  shopId,
  paid,
  admin = false,
  onDone,
}: {
  shopId: string;
  paid: boolean;
  admin?: boolean;
  /** Where "Save" and "Cancel" go. Defaults to the owner's `/shop`. */
  onDone?: () => void;
}) {
  const { t } = useT();
  const { queueId } = useParams();
  const navigate = useNavigate();
  const existing = useDoc(queueId ? queueDoc(shopId, queueId) : null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; warn: boolean } | null>(
    null,
  );

  if (queueId && existing.loading) return <p className="panel">{t('common.loading')}</p>;

  const q = existing.data;
  const done = onDone ?? (() => navigate('/shop'));

  // How long "Saved" (and the geocoding outcome) stays on screen before
  // moving on — long enough to actually read, short enough that leaving
  // still feels immediate.
  const NOTICE_DELAY_MS = 1400;

  function placementNotice(geocoded: Geocoded | null): {
    text: string;
    warn: boolean;
  } {
    return geocoded
      ? { text: t('shop.queueForm.noticePlacedAt', { address: geocoded.formatted }), warn: false }
      : { text: t('shop.queueForm.noticePlacementFailed'), warn: true };
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      name: String(form.get('name') ?? ''),
      address: String(form.get('address') ?? ''),
      category: String(form.get('category')) as QueueCategory,
      maxSize: Number(form.get('maxSize')),
      avgServiceTimeSeconds: Number(form.get('avgServiceMinutes')) * 60,
      noShowPenalty: String(form.get('noShowPenalty')) as NoShowPenalty,
      description: String(form.get('description') ?? '') || null,
    };

    setBusy(true);
    setError(null);
    setNotice(null);
    void (async () => {
      try {
        if (admin && queueId) {
          const { geocoded } = await adminUpdateQueue({ shopId, queueId, ...values });
          const { text, warn } = placementNotice(geocoded);
          setNotice({ text: t('shop.queueForm.noticeSaved', { detail: text }), warn });
          setTimeout(done, NOTICE_DELAY_MS);
        } else if (queueId) {
          // Goes through a function, not a direct write: changing the address
          // has to re-geocode, or the queue would be listed where it no
          // longer is.
          const { geocoded } = await updateQueue({ shopId, queueId, ...values });
          const { text, warn } = placementNotice(geocoded);
          setNotice({ text: t('shop.queueForm.noticeSaved', { detail: text }), warn });
          setTimeout(done, NOTICE_DELAY_MS);
        } else {
          const { queueId: created, geocoded } = await createQueue({
            shopId,
            ...values,
          });
          const { text, warn } = placementNotice(geocoded);
          setNotice({ text: t('shop.queueForm.noticeCreated', { detail: text }), warn });
          setTimeout(() => navigate(`/shop/q/${created}/serve`), NOTICE_DELAY_MS);
        }
      } catch (e) {
        setError(messageOf(e));
        setBusy(false);
      }
    })();
  }

  return (
    <main className="panel">
      <h1>{queueId ? t('shop.queueForm.titleSettings') : t('shop.queueForm.titleNew')}</h1>

      <form onSubmit={onSubmit} className="stack">
        <label htmlFor="name">{t('shop.queueForm.nameLabel')}</label>
        <input id="name" name="name" defaultValue={q?.name ?? ''} required />

        <label htmlFor="address">{t('shop.queueForm.addressLabel')}</label>
        <AddressField id="address" name="address" defaultValue={q?.address ?? ''} required />
        <p className="hint">{t('shop.queueForm.addressHint')}</p>

        <label htmlFor="category">{t('shop.queueForm.categoryLabel')}</label>
        <select id="category" name="category" defaultValue={q?.category ?? 'other'}>
          {QUEUE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`categories.${c}`)}
            </option>
          ))}
        </select>

        <label htmlFor="maxSize">{t('shop.queueForm.maxSizeLabel')}</label>
        <input
          id="maxSize"
          name="maxSize"
          type="number"
          min={1}
          defaultValue={q?.maxSize ?? 20}
          required
        />

        <label htmlFor="avgServiceMinutes">{t('shop.queueForm.avgServiceLabel')}</label>
        <input
          id="avgServiceMinutes"
          name="avgServiceMinutes"
          type="number"
          min={1}
          defaultValue={(q?.avgServiceTimeSeconds ?? 300) / 60}
          required
        />
        <p className="hint">{t('shop.queueForm.avgServiceHint')}</p>

        <label htmlFor="noShowPenalty">{t('shop.queueForm.noShowLabel')}</label>
        <select
          id="noShowPenalty"
          name="noShowPenalty"
          defaultValue={q?.noShowPenalty ?? 'back'}
        >
          {PENALTIES.map((p) => (
            <option key={p} value={p}>
              {t(`shop.queueForm.penalty.${p}`)}
            </option>
          ))}
        </select>
        <p className="hint">{t('shop.queueForm.noShowHint')}</p>

        <label htmlFor="description">{t('shop.queueForm.descriptionLabel')}</label>
        <textarea
          id="description"
          name="description"
          rows={2}
          disabled={!paid}
          defaultValue={q?.description ?? ''}
        />
        {!paid && (
          <p className="hint">
            {t('shop.queueForm.descriptionPaidHint')}{' '}
            <LocalizedLink to="/shop/billing">{t('shop.queueForm.seePlans')}</LocalizedLink>.
          </p>
        )}

        <div className="row">
          <button type="submit" disabled={busy}>
            {queueId ? t('shop.queueForm.save') : t('shop.queueForm.create')}
          </button>
          <button type="button" className="secondary" onClick={done}>
            {t('common.cancel')}
          </button>
        </div>
      </form>

      {notice && (
        <p className={`notice${notice.warn ? ' warn' : ''}`} role="status">
          {notice.text}
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
