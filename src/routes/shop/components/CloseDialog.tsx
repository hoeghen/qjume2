import { useState } from 'react';
import { closeQueue, messageOf } from '../../../lib/functions.js';

interface Props {
  shopId: string;
  queueId: string;
  waitingCount: number;
  onClose: () => void;
}

/**
 * Closing with people still waiting is a decision the owner makes in the
 * moment, seeing how many are left — not a setting chosen in advance.
 */
export function CloseDialog({ shopId, queueId, waitingCount, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(mode: 'drain' | 'hard') {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        await closeQueue({ shopId, queueId, mode });
        onClose();
      } catch (e) {
        setError(messageOf(e));
        setBusy(false);
      }
    })();
  }

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-label="Close the queue">
      <div className="dialog-body">
        <h2>Close the queue</h2>
        <p>
          {waitingCount === 0
            ? 'Nobody is waiting.'
            : `${waitingCount} ${waitingCount === 1 ? 'person is' : 'people are'} still waiting.`}
        </p>

        <div className="stack">
          <button type="button" disabled={busy} onClick={() => run('drain')}>
            Stop new joiners, finish serving
          </button>
          <button
            type="button"
            className="danger"
            disabled={busy}
            onClick={() => run('hard')}
          >
            Close now and clear the queue
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
      </div>
    </div>
  );
}
