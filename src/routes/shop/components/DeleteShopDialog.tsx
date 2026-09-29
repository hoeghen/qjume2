import { useState } from 'react';
import { adminDeleteShop, deleteShop, messageOf } from '../../../lib/functions.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';

interface Props {
  shopId: string;
  shopName: string;
  admin: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

/**
 * Deleting a shop takes its queues, tickets and staff with it, and cannot be
 * undone. Typing the name back is the friction that makes this different
 * from every other confirm in either the owner's or the admin's screens — a
 * misclick here is not recoverable the way a wrong suspend is.
 */
export function DeleteShopDialog({ shopId, shopName, admin, onClose, onDeleted }: Props) {
  const { t } = useT();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim() === shopName;

  function run() {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const fn = admin ? adminDeleteShop : deleteShop;
        await fn({ shopId });
        onDeleted();
      } catch (e) {
        setError(messageOf(e));
        setBusy(false);
      }
    })();
  }

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-label={t('shop.deleteShop.ariaLabel')}>
      <div className="dialog-body">
        <h2>{t('shop.deleteShop.title', { name: shopName })}</h2>
        <p>{t('shop.deleteShop.body')}</p>

        <label htmlFor="confirm-name">{t('shop.deleteShop.confirmLabel')}</label>
        <input
          id="confirm-name"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={shopName}
          autoComplete="off"
        />

        <div className="stack">
          <button
            type="button"
            className="danger"
            disabled={busy || !matches}
            onClick={run}
          >
            {t('shop.deleteShop.deletePermanently')}
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
