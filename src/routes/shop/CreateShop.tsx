import { useState, type FormEvent } from 'react';
import { setDoc } from 'firebase/firestore';
import { doc } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import { shopConverter } from '../../lib/firestore/converters.js';
import { messageOf } from '../../lib/functions.js';
import type { Shop } from '../../types/index.js';

export function CreateShop({ ownerUid }: { ownerUid: string }) {
  const [name, setName] = useState('');
  const [exclusive, setExclusive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const shop: Shop = {
          name: trimmed,
          ownerUid,
          plan: 'free',
          exclusiveQueues: exclusive,
        };
        await setDoc(doc(db, 'shops', ownerUid).withConverter(shopConverter), shop);
      } catch (e) {
        setError(messageOf(e));
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <main className="panel">
      <h1>Set up your shop</h1>
      <p className="muted">
        &ldquo;Shop&rdquo; means any organisation running a queue — a clinic, a
        council office, a workshop.
      </p>

      <form onSubmit={onSubmit} className="stack">
        <label htmlFor="shop-name">Name</label>
        <input
          id="shop-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label className="checkbox">
          <input
            type="checkbox"
            checked={exclusive}
            onChange={(e) => setExclusive(e.target.checked)}
          />
          <span>
            My queues are alternatives to each other — a customer should join
            only one
          </span>
        </label>

        <button type="submit" disabled={busy}>
          Create shop
        </button>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
