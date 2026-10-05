import { useState } from 'react';
import {
  messageOf,
  relinkTicket,
  removeTicket,
} from '../../../lib/functions.js';
import { ticketContactDoc } from '../../../lib/firestore/index.js';
import { useDoc } from '../../../lib/hooks/useFirestore.js';
import { formatWaitCompact } from '../../../lib/format.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';
import type { Ticket } from '../../../types/index.js';

type WaitingTicket = Ticket & { id: string };

interface Props {
  shopId: string;
  queueId: string;
  waiting: WaitingTicket[];
  /** Both actions call a Cloud Function, so neither works offline. */
  online: boolean;
  /**
   * The estimate for someone with this many people ahead — the same figure
   * that customer's own ticket shows them. Staff only; the monitor does not
   * use this list.
   */
  waitSeconds: (peopleAhead: number) => number;
}

export function UpcomingList({
  shopId,
  queueId,
  waiting,
  online,
  waitSeconds,
}: Props) {
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
            <ResumeCode shopId={shopId} queueId={queueId} ticketId={ticket.id} />
            {/* Row i has i people ahead of it, as the customer counts it. */}
            <span className="muted upcoming-wait" title={t('shop.upcomingList.waitTitle')}>
              {formatWaitCompact(waitSeconds(i), t)}
            </span>
            {ticket.noShowCount > 0 && (
              <span
                className="strikes"
                title={`${t('shop.upcomingList.noShowTitle')}: ${t(
                  'shop.upcomingList.noShowCount',
                  { count: ticket.noShowCount },
                )}`}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 3 21 20 3 20Z" />
                  <text
                    x="12"
                    y="17.5"
                    textAnchor="middle"
                    stroke="none"
                    fill="currentColor"
                    fontSize="9"
                    fontWeight="700"
                  >
                    {ticket.noShowCount}
                  </text>
                </svg>
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

/**
 * The ticket's resume code, read from its private doc — staff may read it,
 * the public may not. Shown beside the name on purpose (CLAUDE.md decision
 * 15). Nothing for a ticket from before codes were kept readable; "Give
 * code" issues one.
 */
function ResumeCode({
  shopId,
  queueId,
  ticketId,
}: {
  shopId: string;
  queueId: string;
  ticketId: string;
}) {
  const { t } = useT();
  const { data } = useDoc(ticketContactDoc(shopId, queueId, ticketId));
  if (!data?.resumeCode) return null;
  return (
    <span className="code resume-code" title={t('shop.upcomingList.codeTitle')}>
      {data.resumeCode}
    </span>
  );
}
