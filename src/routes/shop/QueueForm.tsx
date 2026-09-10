import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { queueDoc } from '../../lib/firestore/paths.js';
import { useDoc } from '../../lib/hooks/useFirestore.js';
import { createQueue, messageOf, updateQueue } from '../../lib/functions.js';
import {
  QUEUE_CATEGORIES,
  type NoShowPenalty,
  type QueueCategory,
} from '../../types/index.js';

const CATEGORY_LABELS: Record<QueueCategory, string> = {
  'food-and-drink': 'Food and drink',
  'health-and-medical': 'Health and medical',
  'government-and-public-services': 'Government and public services',
  'banking-and-finance': 'Banking and finance',
  'retail-and-shopping': 'Retail and shopping',
  'personal-care': 'Personal care',
  automotive: 'Automotive',
  education: 'Education',
  'transport-and-travel': 'Transport and travel',
  'events-and-attractions': 'Events and attractions',
  other: 'Other',
};

const PENALTY_LABELS: Record<NoShowPenalty, string> = {
  back: 'Move to the back of the queue',
  back3: 'Move back 3 places',
  back5: 'Move back 5 places',
};

export function QueueForm({ shopId }: { shopId: string }) {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const existing = useDoc(queueId ? queueDoc(shopId, queueId) : null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (queueId && existing.loading) return <p className="panel">Loading…</p>;

  const q = existing.data;

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
    void (async () => {
      try {
        if (queueId) {
          // Goes through a function, not a direct write: changing the address
          // has to re-geocode, or the queue would be listed where it no
          // longer is.
          await updateQueue({ shopId, queueId, ...values });
          navigate('/shop');
        } else {
          const { queueId: created } = await createQueue({ shopId, ...values });
          navigate(`/shop/q/${created}/serve`);
        }
      } catch (e) {
        setError(messageOf(e));
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <main className="panel">
      <h1>{queueId ? 'Queue settings' : 'New queue'}</h1>

      <form onSubmit={onSubmit} className="stack">
        <label htmlFor="name">Queue name</label>
        <input id="name" name="name" defaultValue={q?.name ?? ''} required />

        <label htmlFor="address">Address</label>
        <input
          id="address"
          name="address"
          defaultValue={q?.address ?? ''}
          required
        />
        <p className="hint">
          A fixed address, not your device&rsquo;s location — this is what
          customers see and search by.
        </p>

        <label htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue={q?.category ?? 'other'}>
          {QUEUE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>

        <label htmlFor="maxSize">Maximum queue size</label>
        <input
          id="maxSize"
          name="maxSize"
          type="number"
          min={1}
          defaultValue={q?.maxSize ?? 20}
          required
        />

        <label htmlFor="avgServiceMinutes">
          Average time per customer (minutes)
        </label>
        <input
          id="avgServiceMinutes"
          name="avgServiceMinutes"
          type="number"
          min={1}
          defaultValue={(q?.avgServiceTimeSeconds ?? 300) / 60}
          required
        />
        <p className="hint">
          A starting estimate. Qjume refines it from how long you actually take.
        </p>

        <label htmlFor="noShowPenalty">If someone isn&rsquo;t there</label>
        <select
          id="noShowPenalty"
          name="noShowPenalty"
          defaultValue={q?.noShowPenalty ?? 'back'}
        >
          {(Object.keys(PENALTY_LABELS) as NoShowPenalty[]).map((p) => (
            <option key={p} value={p}>
              {PENALTY_LABELS[p]}
            </option>
          ))}
        </select>
        <p className="hint">
          After three no-shows they lose their place entirely.
        </p>

        <label htmlFor="description">Description (optional)</label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={q?.description ?? ''}
        />

        <div className="row">
          <button type="submit" disabled={busy}>
            {queueId ? 'Save' : 'Create queue'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => navigate('/shop')}
          >
            Cancel
          </button>
        </div>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
