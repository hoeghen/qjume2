import { useState } from 'react';
import { closeQueue, messageOf } from '../../../lib/functions.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';

interface Props {
  shopId: string;
  queueId: string;
  waitingCount: number;
  onClose: () => void;
}

/**
 * Closing with people still waiting is a decision the owner makes in the
 * moment, seeing how many are left — not a setting chosen in advance.
 */
export function CloseDialog({ shopId, queueId, waitingCount, onClose }: Props) {
  const { t, tn } = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(mode: 'drain' | 'hard') {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        await closeQueue({ shopId, queueId, mode });
        onClose();
      } catch (e) {
        setError(messageOf(e));
        setBusy(false);
      }
    })();
  }

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-label={t('shop.closeDialog.ariaLabel')}>
      <div className="dialog-body">
        <h2>{t('shop.closeDialog.title')}</h2>
        <p>
          {waitingCount === 0
            ? t('shop.closeDialog.nobodyWaiting')
            : tn(waitingCount, 'shop.closeDialog.someWaiting')}
        </p>

        <div className="stack">
          <button type="button" disabled={busy} onClick={() => run('drain')}>
            {t('shop.closeDialog.drainAction')}
          </button>
          <button
            type="button"
            className="danger"
            disabled={busy}
            onClick={() => run('hard')}
          >
            {t('shop.closeDialog.hardAction')}
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
