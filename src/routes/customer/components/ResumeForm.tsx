import { useState, type FormEvent } from 'react';
import { signInAsGuest } from '../../../lib/auth.js';
import { useAuth } from '../../../lib/hooks/useAuth.js';
import { claimTicket, messageOf } from '../../../lib/functions.js';
import { rememberTicket } from '../../../lib/myTickets.js';

interface Props {
  shopId: string;
  queueId: string;
  onClaimed: (ticketId: string) => void;
}

/** Getting a place back on a new device, using the code from joining. */
export function ResumeForm({ shopId, queueId, onClaimed }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" className="link" onClick={() => setOpen(true)}>
        Already in this queue? Enter your code
      </button>
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const entered = code.trim();
    if (!entered) return;

    setBusy(true);
    setError(null);
    void (async () => {
      try {
        if (!user) await signInAsGuest();
        const result = await claimTicket({ shopId, queueId, resumeCode: entered });
        rememberTicket(shopId, queueId, result.ticketId);
        onClaimed(result.ticketId);
      } catch (e) {
        setError(messageOf(e));
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <label htmlFor="resume-code">Your code</label>
      <input
        id="resume-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        // Six characters, no ambiguous letters, so it survives being read out.
        maxLength={6}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        className="code-input"
        autoFocus
        required
      />
      <p className="hint">
        Lost it? Ask the shop — they can find you by name and issue a new one.
      </p>
      <div className="row">
        <button type="submit" disabled={busy}>
          Get my place back
        </button>
        <button type="button" className="secondary" onClick={() => setOpen(false)}>
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
