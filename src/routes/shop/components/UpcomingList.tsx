import { useState } from 'react';
import {
  messageOf,
  relinkTicket,
  removeTicket,
} from '../../../lib/functions.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';
import type { Ticket } from '../../../types/index.js';

type WaitingTicket = Ticket & { id: string };

interface Props {
  shopId: string;
  queueId: string;
  waiting: WaitingTicket[];
  /** Both actions call a Cloud Function, so neither works offline. */
  online: boolean;
}

export function UpcomingList({ shopId, queueId, waiting, online }: Props) {
  const { t } = useT();
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
    return <p className="muted">{t('shop.upcomingList.nobodyWaiting')}</p>;
  }

  return (
    <>
      <ol className="upcoming">
        {waiting.map((ticket, i) => (
          <li key={ticket.id}>
            <span className="place">{i + 1}</span>
            <span className="name">{ticket.displayName}</span>
            {ticket.noShowCount > 0 && (
              <span className="strikes" title={t('shop.upcomingList.noShowTitle')}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 4 21 19 3 19Z" />
                  <path d="M12 10v4M12 16.5h.01" />
                </svg>
                {t('shop.upcomingList.noShowCount', { count: ticket.noShowCount })}
              </span>
            )}
            <span className="row tight">
              <button
                type="button"
                className="link"
                disabled={!online}
                onClick={() =>
                  void run(async () => {
                    const r = await relinkTicket({
                      shopId,
                      queueId,
                      ticketId: ticket.id,
                    });
                    setRelinked({ name: r.displayName, code: r.resumeCode });
                  })
                }
              >
                {t('shop.upcomingList.relink')}
              </button>
              <button
                type="button"
                className="link danger"
                disabled={!online}
                onClick={() =>
                  void run(() =>
                    removeTicket({ shopId, queueId, ticketId: ticket.id }).then(
                      () => undefined,
                    ),
                  )
                }
              >
                {t('shop.upcomingList.remove')}
              </button>
            </span>
          </li>
        ))}
      </ol>

      {relinked && (
        <div className="dialog" role="dialog" aria-modal="true">
          <div className="dialog-body">
            <h2>{t('shop.upcomingList.newCodeTitle', { name: relinked.name })}</h2>
            <p>{t('shop.upcomingList.newCodeBody')}</p>
            <p className="code big">{relinked.code}</p>
            <button type="button" onClick={() => setRelinked(null)}>
              {t('shop.upcomingList.done')}
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
