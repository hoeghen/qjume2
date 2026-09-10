import { useState, type FormEvent } from 'react';
import { addWalkIn, messageOf } from '../../../lib/functions.js';

interface Props {
  shopId: string;
  queueId: string;
  onClose: () => void;
}

/** For a customer with no smartphone. They follow the in-shop monitor. */
export function WalkInDialog({ shopId, queueId, onClose }: Props) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ number: number; code: string } | null>(
    null,
  );

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const result = await addWalkIn({ shopId, queueId, displayName: trimmed });
        setIssued({ number: result.number, code: result.resumeCode });
      } catch (e) {
        setError(messageOf(e));
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-label="Add a walk-in">
      <div className="dialog-body">
        {issued ? (
          <>
            <h2>Ticket {issued.number}</h2>
            <p>
              Give <strong>{name.trim()}</strong> this number, and tell them to
              watch the screen.
            </p>
            <p className="hint">
              If they do have a phone after all, this code claims the ticket:{' '}
              <code className="code">{issued.code}</code>
            </p>
            <button type="button" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <form onSubmit={onSubmit} className="stack">
            <h2>Add a walk-in</h2>
            <label htmlFor="walkin-name">Name to call them by</label>
            <input
              id="walkin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
            <div className="row">
              <button type="submit" disabled={busy}>
                Add to queue
              </button>
              <button type="button" className="secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
