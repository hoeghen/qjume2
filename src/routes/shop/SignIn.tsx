import { useState, type FormEvent } from 'react';
import {
  sendEmailLink,
  signInWithApple,
  signInWithGoogle,
} from '../../lib/auth.js';
import { messageOf } from '../../lib/functions.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';

export function SignIn() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    void run(async () => {
      await sendEmailLink(email.trim());
      setSent(true);
    });
  }

  return (
    <main className="panel">
      <h1>{t('shop.signIn.title')}</h1>
      <p className="muted">{t('shop.signIn.subtitle')}</p>

      {sent ? (
        <p className="notice" role="status">
          {t('shop.signIn.checkEmailBefore')}
          <strong>{email}</strong>
          {t('shop.signIn.checkEmailAfter')}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="stack">
          <label htmlFor="email">{t('shop.signIn.emailLabel')}</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={busy}>
            {t('shop.signIn.emailButton')}
          </button>
        </form>
      )}

      <div className="divider">{t('shop.signIn.or')}</div>

      <div className="stack">
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => void run(signInWithGoogle)}
        >
          {t('shop.signIn.continueGoogle')}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => void run(signInWithApple)}
        >
          {t('shop.signIn.continueApple')}
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <p className="hint">
        {t('shop.signIn.agreeBefore')}
        <LocalizedLink to="/terms">{t('shop.signIn.terms')}</LocalizedLink>
        {t('shop.signIn.and')}
        <LocalizedLink to="/privacy">{t('shop.signIn.privacy')}</LocalizedLink>
        {t('shop.signIn.period')}
      </p>
    </main>
  );
}
