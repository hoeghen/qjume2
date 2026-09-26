import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth.js';
import { signInAsPlatformAdmin } from '../../lib/auth.js';
import { messageOf } from '../../lib/functions.js';
import { isMock } from '../../lib/mock/mode.js';
import { BuildInfo } from '../../components/BuildInfo.js';
import { useT } from '../../lib/i18n/LanguageContext.js';

/**
 * Gate for everything under `/admin`.
 *
 * There is no self-serve way in, on either backend — the `platformAdmin`
 * claim is set once, by hand, against the one account that needs it
 * (CLAUDE.md decision 9). On the real backend that leaves nothing to render
 * here but a refusal. The mock has no Firebase to set a claim on at all, so
 * it offers its own stand-in identity instead: `local-admin`, entered the
 * same way `local-owner` is on `/shop` — a button, not a form, since there
 * is no real credential to check.
 */
export function AdminHome() {
  const { t } = useT();
  const { user, loading, isPlatformAdmin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="panel">{t('common.loading')}</p>;

  if (!isPlatformAdmin) {
    return (
      <main className="panel">
        <h1>{t('admin.gate.title')}</h1>
        {isMock ? (
          <>
            <p className="muted">{t('admin.gate.mockNotice')}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError(null);
                void signInAsPlatformAdmin()
                  .catch((e: unknown) => setError(messageOf(e)))
                  .finally(() => setBusy(false));
              }}
            >
              {t('admin.gate.continueAsAdmin')}
            </button>
          </>
        ) : (
          <p className="muted">
            {user ? t('admin.gate.noAccess') : t('admin.gate.signInPrompt')}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </main>
    );
  }

  return (
    <>
      <Outlet />
      <BuildInfo />
    </>
  );
}
