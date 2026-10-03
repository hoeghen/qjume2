import { useT } from '../../../lib/i18n/LanguageContext.js';

interface Props {
  name: string;
  busy: boolean;
  error: string | null;
  onDone: () => void;
  onCancel: () => void;
}

/**
 * Asked before leaving a till with a customer still at it.
 *
 * The customer belongs to the till, not to the person behind it, so walking
 * away would leave them "being served" until somebody else at that till
 * tapped Next — uncounted, and stuck on the monitor.
 */
export function SwitchStationDialog({ name, busy, error, onDone, onCancel }: Props) {
  const { t } = useT();
  return (
    <div
      className="dialog"
      role="dialog"
      aria-modal="true"
      aria-label={t('shop.switchStation.title', { name })}
    >
      <div className="dialog-body">
        <h2>{t('shop.switchStation.title', { name })}</h2>
        <p>{t('shop.switchStation.body')}</p>

        <div className="stack">
          <button type="button" disabled={busy} onClick={onDone}>
            {t('shop.switchStation.done')}
          </button>
          <button type="button" className="secondary" disabled={busy} onClick={onCancel}>
            {t('shop.switchStation.cancel')}
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
