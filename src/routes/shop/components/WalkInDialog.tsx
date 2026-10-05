import { useState, type FormEvent } from 'react';
import { addWalkIn, messageOf } from '../../../lib/functions.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';

interface Props {
  shopId: string;
  queueId: string;
  onClose: () => void;
}

/** For a customer with no smartphone. They follow the in-shop monitor. */
export function WalkInDialog({ shopId, queueId, onClose }: Props) {
  const { t } = useT();
  const [name, setName] = useState('');
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
        await addWalkIn({ shopId, queueId, displayName: trimmed });
        // Straight back to the list: the new name, its code and its wait
        // show there, so a confirmation would only be one more tap.
        onClose();
      } catch (e) {
        setError(messageOf(e));
        setBusy(false);
      }
    })();
  }

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-label={t('shop.walkIn.dialogLabel')}>
      <div className="dialog-body">
        <form onSubmit={onSubmit} className="stack">
          <h2>{t('shop.walkIn.dialogLabel')}</h2>
          <label htmlFor="walkin-name">{t('shop.walkIn.nameLabel')}</label>
          <input
            id="walkin-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
          <div className="row">
            <button type="submit" disabled={busy}>
              {t('shop.walkIn.addToQueue')}
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
        </form>
      </div>
    </div>
  );
}
