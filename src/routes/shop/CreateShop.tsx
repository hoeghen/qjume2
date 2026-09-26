import { useState, type FormEvent } from 'react';
import { createShop } from '../../lib/firestore/writes.js';
import { messageOf } from '../../lib/functions.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import type { Shop } from '../../types/index.js';

export function CreateShop({ ownerUid }: { ownerUid: string }) {
  const { t } = useT();
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
          suspended: false,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        };
        await createShop(ownerUid, shop);
      } catch (e) {
        setError(messageOf(e));
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <main className="panel">
      <h1>{t('shop.createShop.title')}</h1>
      <p className="muted">{t('shop.createShop.subtitle')}</p>

      <form onSubmit={onSubmit} className="stack">
        <label htmlFor="shop-name">{t('shop.createShop.nameLabel')}</label>
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
          <span>{t('shop.createShop.exclusiveLabel')}</span>
        </label>

        <button type="submit" disabled={busy}>
          {t('shop.createShop.submit')}
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
