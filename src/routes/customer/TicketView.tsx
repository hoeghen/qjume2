import { useState } from 'react';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { ticketDoc } from '../../lib/firestore/paths.js';
import { ticketsAhead } from '../../lib/firestore/queries.js';
import { leaveQueue, messageOf } from '../../lib/functions.js';
import { forgetTicket } from '../../lib/myTickets.js';
import { formatWait } from '../../lib/format.js';
import type { Queue } from '../../types/index.js';

interface Props {
  shopId: string;
  queueId: string;
  ticketId: string;
  queue: Queue;
  activeStations: number;
  onLeft: () => void;
}

/**
 * The customer's live view of their own place.
 *
 * Both the ticket and the queue ahead of it are Firestore listeners, so the
 * position moves on its own as staff work through the queue — no polling, no
 * refresh. This screen is load-bearing on iOS, where a meaningful share of
 * customers will never grant push and this is all they get.
 */
export function TicketView({
  shopId,
  queueId,
  ticketId,
  queue,
  activeStations,
  onLeft,
}: Props) {
  const ticket = useDoc(ticketDoc(shopId, queueId, ticketId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const position = ticket.data?.position ?? null;
  const { data: ahead } = useCollection(
    position === null ? null : ticketsAhead(shopId, queueId, position),
    `${shopId}/${queueId}/ahead/${position}`,
  );

  if (ticket.loading) return <p>Loading your place…</p>;
  if (!ticket.data) {
    return (
      <div className="notice">
        <p>We can no longer find that ticket.</p>
        <button type="button" onClick={onLeft}>
          Back to the queue
        </button>
      </div>
    );
  }

  const t = ticket.data;

  if (t.state === 'serving') {
    return (
      <section className="now-serving">
        <p className="label">It&rsquo;s your turn</p>
        <p className="called-name">{t.displayName}</p>
        {t.station && <p className="called-station">Go to {t.station}</p>}
      </section>
    );
  }

  if (t.state !== 'waiting') {
    const reason =
      t.state === 'noShow' || t.state === 'removed'
        ? t.noShowCount >= 3
          ? 'You missed your turn three times, so your place has gone.'
          : 'The shop took you out of the queue.'
        : t.state === 'left'
          ? 'You left this queue.'
          : 'You have been served.';
    return (
      <div className="notice">
        <p>{reason}</p>
        <button type="button" onClick={onLeft}>
          Back to the queue
        </button>
      </div>
    );
  }

  const peopleAhead = ahead?.length ?? 0;
  const serviceTime =
    queue.observedServiceTimeSeconds ?? queue.avgServiceTimeSeconds;
  const wait = Math.round(
    (peopleAhead * serviceTime) / Math.max(1, activeStations),
  );

  function leave() {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        await leaveQueue({ shopId, queueId, ticketId });
        forgetTicket(shopId, queueId);
        onLeft();
      } catch (e) {
        setError(messageOf(e));
        setBusy(false);
      }
    })();
  }

  return (
    <>
      <section className="ticket">
        <p className="label">You are</p>
        <p className="called-name">
          {peopleAhead === 0 ? 'next' : `${peopleAhead + 1}${ordinal(peopleAhead + 1)}`}
        </p>
        <p className="called-station">
          {peopleAhead === 0
            ? 'You should be called any moment'
            : `${peopleAhead} ${peopleAhead === 1 ? 'person' : 'people'} ahead of you`}
        </p>
      </section>

      <section className="stats">
        <div>
          <span className="stat-value">{formatWait(wait)}</span>
          <span className="stat-label">estimated wait</span>
        </div>
        <div>
          <span className="stat-value">{t.displayName}</span>
          <span className="stat-label">called as</span>
        </div>
      </section>

      {queue.status === 'unavailable' && (
        <p className="status-banner status-unavailable" role="status">
          <span>
            The shop is offline, so this may be out of date. Your place is
            safe.
          </span>
        </p>
      )}

      {t.noShowCount > 0 && (
        <p className="notice">
          You have missed {t.noShowCount} of 3 calls. After three, you lose your
          place.
        </p>
      )}

      <button type="button" className="secondary" disabled={busy} onClick={leave}>
        Leave the queue
      </button>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}
