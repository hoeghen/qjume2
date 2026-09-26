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
  const [issued, setIssued] = useState<{ number: number; code: string } | null>(
    null,
  );

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const result = await addWalkIn({ shopId, queueId, displayName: trimmed });
        setIssued({ number: result.number, code: result.resumeCode });
      } catch (e) {
        setError(messageOf(e));
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-label={t('shop.walkIn.dialogLabel')}>
      <div className="dialog-body">
        {issued ? (
          <>
            <h2>{t('shop.walkIn.ticketNumber', { number: issued.number })}</h2>
            <p>
              {t('shop.walkIn.giveBefore')}
              <strong>{name.trim()}</strong>
              {t('shop.walkIn.giveAfter')}
            </p>
            <p className="hint">
              {t('shop.walkIn.hintBefore')}
              <code className="code">{issued.code}</code>
            </p>
            <button type="button" onClick={onClose}>
              {t('shop.walkIn.done')}
            </button>
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
}
