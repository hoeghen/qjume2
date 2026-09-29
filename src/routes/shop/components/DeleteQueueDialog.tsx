import { useState } from 'react';
import { adminDeleteQueue, deleteQueue, messageOf } from '../../../lib/functions.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';

interface Props {
  shopId: string;
  queueId: string;
  /** Already resolved to the shop's own name when the queue has none. */
  queueName: string;
  admin: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

/**
 * Deleting a queue takes its tickets with it — anyone currently waiting loses
 * their place with no notice, and there is no undo. Typing the name back is
 * the same friction `DeleteShopDialog` uses for the same reason: a misclick
 * here is not recoverable the way a wrong pause or close is.
 */
export function DeleteQueueDialog({
  shopId,
  queueId,
  queueName,
  admin,
  onClose,
  onDeleted,
}: Props) {
  const { t } = useT();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim() === queueName;

  function run() {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const fn = admin ? adminDeleteQueue : deleteQueue;
        await fn({ shopId, queueId });
        onDeleted();
      } catch (e) {
        setError(messageOf(e));
        setBusy(false);
      }
    })();
  }

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-label={t('shop.deleteQueue.ariaLabel')}>
      <div className="dialog-body">
        <h2>{t('shop.deleteQueue.title', { name: queueName })}</h2>
        <p>{t('shop.deleteQueue.body')}</p>

        <label htmlFor="confirm-queue-name">{t('shop.deleteQueue.confirmLabel')}</label>
        <input
          id="confirm-queue-name"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={queueName}
          autoComplete="off"
        />

        <div className="stack">
          <button
            type="button"
            className="danger"
            disabled={busy || !matches}
            onClick={run}
          >
            {t('shop.deleteQueue.deletePermanently')}
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
