import { useState } from 'react';
import {
  messageOf,
  relinkTicket,
  removeTicket,
} from '../../../lib/functions.js';
import type { Ticket } from '../../../types/index.js';

type WaitingTicket = Ticket & { id: string };

interface Props {
  shopId: string;
  queueId: string;
  waiting: WaitingTicket[];
}

export function UpcomingList({ shopId, queueId, waiting }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [relinked, setRelinked] = useState<{ name: string; code: string } | null>(
    null,
  );

  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(messageOf(e));
    }
  }

  if (waiting.length === 0) {
    return <p className="muted">Nobody waiting.</p>;
  }

  return (
    <>
      <ol className="upcoming">
        {waiting.map((t, i) => (
          <li key={t.id}>
            <span className="place">{i + 1}</span>
            <span className="name">{t.displayName}</span>
            {t.noShowCount > 0 && (
              <span className="strikes" title="No-shows so far">
                {t.noShowCount} of 3
              </span>
            )}
            <span className="row tight">
              <button
                type="button"
                className="link"
                onClick={() =>
                  void run(async () => {
                    const r = await relinkTicket({
                      shopId,
                      queueId,
                      ticketId: t.id,
                    });
                    setRelinked({ name: r.displayName, code: r.resumeCode });
                  })
                }
              >
                Re-link
              </button>
              <button
                type="button"
                className="link danger"
                onClick={() =>
                  void run(() =>
                    removeTicket({ shopId, queueId, ticketId: t.id }).then(
                      () => undefined,
                    ),
                  )
                }
              >
                Remove
              </button>
            </span>
          </li>
        ))}
      </ol>

      {relinked && (
        <div className="dialog" role="dialog" aria-modal="true">
          <div className="dialog-body">
            <h2>New code for {relinked.name}</h2>
            <p>
              Read this out. It replaces any code they had, and gets their place
              back on a new phone.
            </p>
            <p className="code big">{relinked.code}</p>
            <button type="button" onClick={() => setRelinked(null)}>
              Done
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
