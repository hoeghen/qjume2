import { useT } from '../../../lib/i18n/LanguageContext.js';

interface Props {
  code: string;
  onDismiss: () => void;
}

/**
 * Shown once, immediately after joining, and dismissed with one tap.
 *
 * The code is the only way back to a ticket from another device, and a
 * customer who skips it has to ask the shop to re-link them by name. Worth one
 * prompt; not worth nagging.
 */
export function ResumeCodePrompt({ code, onDismiss }: Props) {
  const { t } = useT();
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-label={t('resumeCodePrompt.ariaLabel')}>
      <div className="dialog-body">
        <h2>{t('resumeCodePrompt.title')}</h2>
        <p>{t('resumeCodePrompt.body')}</p>
        <p className="code big">{code}</p>
        <p className="hint">{t('resumeCodePrompt.hint')}</p>
        <button type="button" onClick={onDismiss}>
          {t('resumeCodePrompt.dismiss')}
        </button>
      </div>
    </div>
  );
}
