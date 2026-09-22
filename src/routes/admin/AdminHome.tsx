import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth.js';
import { signInAsPlatformAdmin } from '../../lib/auth.js';
import { messageOf } from '../../lib/functions.js';
import { isMock } from '../../lib/mock/mode.js';

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
  const { user, loading, isPlatformAdmin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="panel">Loading…</p>;

  if (!isPlatformAdmin) {
    return (
      <main className="panel">
        <h1>Platform admin</h1>
        {isMock ? (
          <>
            <p className="muted">
              This is the mock&rsquo;s stand-in for the platform admin claim —
              nothing here is a real credential.
            </p>
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
              Continue as platform admin
            </button>
          </>
        ) : (
          <p className="muted">
            {user
              ? "This account doesn't have platform admin access."
              : 'Sign in with the platform admin account to continue.'}
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

  return <Outlet />;
}
