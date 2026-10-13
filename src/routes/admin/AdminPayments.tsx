import { useState } from 'react';
import { adminRegisterMobilePayWebhook, messageOf } from '../../lib/functions.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';

type Registered = Awaited<ReturnType<typeof adminRegisterMobilePayWebhook>>;

/**
 * Registers the MobilePay webhook from the browser, so setting payments up
 * needs no command line. Done once for the test environment and once again
 * when going live. The secret is shown here once and never stored by the
 * app — it belongs in Secret Manager. CLAUDE.md decision 19.
 */
export function AdminPayments() {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Registered | null>(null);
  const [copied, setCopied] = useState(false);

  function register() {
    if (!window.confirm(t('admin.payments.confirm'))) return;
    setBusy(true);
    setError(null);
    adminRegisterMobilePayWebhook(undefined)
      .then(setRegistered)
      .catch((e: unknown) => setError(messageOf(e)))
      .finally(() => setBusy(false));
  }

  function copy(secret: string) {
    void navigator.clipboard
      .writeText(secret)
      .then(() => setCopied(true))
      .catch(() => undefined);
  }

  return (
    <main className="panel">
      <header className="serving-header">
        <h1>{t('admin.payments.title')}</h1>
        <LocalizedLink className="link" to="/admin">
          {t('admin.shopList.title')}
        </LocalizedLink>
      </header>

      <h2>{t('admin.payments.webhookTitle')}</h2>
      <p>{t('admin.payments.webhookBody')}</p>
      <button type="button" disabled={busy} onClick={register}>
        {t('admin.payments.register')}
      </button>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {registered && (
        <div className="notice" role="status">
          <p>
            {t('admin.payments.registered', {
              environment: registered.environment,
              url: registered.url,
            })}
          </p>
          <label>
            {t('admin.payments.secretLabel')}
            <input type="text" readOnly value={registered.secret} onFocus={(e) => e.target.select()} />
          </label>
          <button type="button" className="secondary" onClick={() => copy(registered.secret)}>
            {copied ? t('admin.payments.copied') : t('admin.payments.copy')}
          </button>
          <p className="hint">{t('admin.payments.nextStep')}</p>
        </div>
      )}
    </main>
  );
}
