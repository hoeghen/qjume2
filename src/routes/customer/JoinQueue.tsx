import { useState, type FormEvent } from 'react';
import { signInAsGuest } from '../../lib/auth.js';
import { useAuth } from '../../lib/hooks/useAuth.js';
import { joinQueue, messageOf } from '../../lib/functions.js';
import { rememberTicket } from '../../lib/myTickets.js';

interface Props {
  shopId: string;
  queueId: string;
  onJoined: (ticketId: string, resumeCode: string) => void;
  onCancel: () => void;
}

/**
 * Joining is anonymous by default — no account, no password, just a name to be
 * called by. Email is offered, not required: it is the fallback that carries
 * the resume code and the notifications for anyone who never grants push.
 */
export function JoinQueue({ shopId, queueId, onJoined, onCancel }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const displayName = name.trim();
    if (!displayName) return;

    setBusy(true);
    setError(null);
    void (async () => {
      try {
        // Anonymous auth gives the ticket an owner without asking anyone to
        // create an account.
        if (!user) await signInAsGuest();
        const result = await joinQueue({
          shopId,
          queueId,
          displayName,
          ...(email.trim() ? { email: email.trim() } : {}),
        });
        rememberTicket(shopId, queueId, result.ticketId);
        onJoined(result.ticketId, result.resumeCode);
      } catch (e) {
        setError(messageOf(e));
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <label htmlFor="display-name">What should we call you?</label>
      <input
        id="display-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="given-name"
        autoFocus
        required
      />
      <p className="hint">Staff will call this out, so a first name is plenty.</p>

      <label htmlFor="join-email">Email (optional)</label>
      <input
        id="join-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <p className="hint">
        So we can reach you if notifications do not work on your phone.
      </p>

      <div className="row">
        <button type="submit" disabled={busy}>
          {busy ? 'Joining…' : 'Join the queue'}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
