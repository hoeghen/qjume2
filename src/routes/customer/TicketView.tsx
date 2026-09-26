import { useState } from 'react';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { ticketDoc } from '../../lib/firestore/paths.js';
import { ticketsAhead } from '../../lib/firestore/queries.js';
import { leaveQueue, messageOf } from '../../lib/functions.js';
import { forgetTicket } from '../../lib/myTickets.js';
import { formatWait } from '../../lib/format.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import type { Locale } from '../../lib/i18n/locale.js';
import { EnableNotifications } from './components/EnableNotifications.js';
import type { Queue } from '../../types/index.js';

interface Props {
  shopId: string;
  queueId: string;
  ticketId: string;
  queue: Queue;
  activeStations: number;
  /** Named counters, so a called ticket can say which one to walk to. */
  stations: { id: string; label: string }[];
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
  stations,
  onLeft,
}: Props) {
  const { t, tn, locale } = useT();
  const ticket = useDoc(ticketDoc(shopId, queueId, ticketId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const position = ticket.data?.position ?? null;
  const { data: ahead } = useCollection(
    position === null ? null : ticketsAhead(shopId, queueId, position),
    `${shopId}/${queueId}/ahead/${position}`,
  );

  if (ticket.loading) return <p>{t('ticketView.loading')}</p>;
  if (!ticket.data) {
    return (
      <div className="notice">
        <p>{t('ticketView.notFound')}</p>
        <button type="button" onClick={onLeft}>
          {t('ticketView.backToQueue')}
        </button>
      </div>
    );
  }

  const ticketData = ticket.data;
  const tillName =
    activeStations > 1 && ticketData.station
      ? (stations.find((s) => s.id === ticketData.station)?.label ?? null)
      : null;

  if (ticketData.state === 'serving') {
    return (
      <section className="now-serving">
        <p className="label">{t('ticketView.yourTurn')}</p>
        <p className="called-name">{ticketData.displayName}</p>
        {/* `ticket.station` is an id, not a label — printing it raw showed
            the customer something like "Go to station3-muay189". And with one
            counter there is nowhere else to go, so it says nothing. */}
        {tillName && <p className="called-station">{t('ticketView.goTo', { station: tillName })}</p>}
      </section>
    );
  }

  if (ticketData.state !== 'waiting') {
    const reason =
      ticketData.state === 'noShow' || ticketData.state === 'removed'
        ? ticketData.noShowCount >= 3
          ? t('ticketView.missedThreeTimes')
          : t('ticketView.removedByShop')
        : ticketData.state === 'left'
          ? t('ticketView.leftQueue')
          : t('ticketView.alreadyServed');
    return (
      <div className="notice">
        <p>{reason}</p>
        <button type="button" onClick={onLeft}>
          {t('ticketView.backToQueue')}
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
        <p className="label">{t('ticketView.youAre')}</p>
        <p className="called-name">
          {peopleAhead === 0
            ? t('ticketView.next')
            : `${peopleAhead + 1}${formatOrdinalSuffix(peopleAhead + 1, locale)}`}
        </p>
        <p className="called-station">
          {peopleAhead === 0
            ? t('ticketView.calledAnyMoment')
            : tn(peopleAhead, 'ticketView.peopleAhead')}
        </p>
      </section>

      <section className="stats">
        <div>
          <span className="stat-value">{formatWait(wait, t)}</span>
          <span className="stat-label">{t('ticketView.estimatedWait')}</span>
        </div>
        <div>
          <span className="stat-value">{ticketData.displayName}</span>
          <span className="stat-label">{t('ticketView.calledAs')}</span>
        </div>
      </section>

      {queue.status === 'unavailable' && (
        <p className="status-banner status-unavailable" role="status">
          <span>{t('ticketView.offlineNotice')}</span>
        </p>
      )}

      {ticketData.noShowCount > 0 && (
        <p className="notice">
          {t('ticketView.missedCalls', { count: ticketData.noShowCount })}
        </p>
      )}

      <EnableNotifications shopId={shopId} queueId={queueId} ticketId={ticketId} />

      <button type="button" className="secondary" disabled={busy} onClick={leave}>
        {t('ticketView.leaveQueue')}
      </button>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

/**
 * English reads "2nd", "3rd"; Danish just appends a period ("2.", "3."),
 * the standard written form for a numeral ordinal.
 */
function formatOrdinalSuffix(n: number, locale: Locale): string {
  if (locale === 'da') return '.';
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
