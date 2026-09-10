import { useState, type FormEvent } from 'react';
import {
  sendEmailLink,
  signInWithApple,
  signInWithGoogle,
} from '../../lib/auth.js';
import { messageOf } from '../../lib/functions.js';

export function SignIn() {
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
      <h1>Run a queue</h1>
      <p className="muted">
        Sign up to create a queue. No business verification needed.
      </p>

      {sent ? (
        <p className="notice" role="status">
          Check <strong>{email}</strong> for a sign-in link.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="stack">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={busy}>
            Email me a link
          </button>
        </form>
      )}

      <div className="divider">or</div>

      <div className="stack">
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => void run(signInWithGoogle)}
        >
          Continue with Google
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => void run(signInWithApple)}
        >
          Continue with Apple
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
