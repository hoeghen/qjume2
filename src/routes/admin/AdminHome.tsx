import { Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth.js';
import { BuildInfo } from '../../components/BuildInfo.js';
import { useT } from '../../lib/i18n/LanguageContext.js';

/**
 * Gate for everything under `/admin`.
 *
 * There is no self-serve way in — the `platformAdmin` claim is set once, by
 * hand, against the one account that needs it (CLAUDE.md decision 9), so
 * there is nothing to render here but a refusal.
 */
export function AdminHome() {
  const { t } = useT();
  const { user, loading, isPlatformAdmin } = useAuth();

  if (loading) return <p className="panel">{t('common.loading')}</p>;

  if (!isPlatformAdmin) {
    return (
      <main className="panel">
        <h1>{t('admin.gate.title')}</h1>
        <p className="muted">
          {user ? t('admin.gate.noAccess') : t('admin.gate.signInPrompt')}
        </p>
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
