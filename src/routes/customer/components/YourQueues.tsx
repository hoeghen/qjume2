import { useEffect, useState } from 'react';
import { useCollection, useDoc } from '../../../lib/hooks/useFirestore.js';
import { queueDoc, ticketDoc } from '../../../lib/firestore/paths.js';
import { stationsOf, ticketsAhead } from '../../../lib/firestore/queries.js';
import {
  forgetTicket,
  heldTickets,
  type HeldTicket,
} from '../../../lib/myTickets.js';
import { formatOrdinalSuffix, formatWaitCompact } from '../../../lib/format.js';
import { LocalizedLink } from '../../../lib/i18n/LocalizedLink.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';

/**
 * The queues this device is standing in, at the top of the screen.
 *
 * A place in line used to be reachable only through the queue's own page, so
 * someone who closed the tab — or opened the installed app, which starts on
 * the landing page — had to search for the shop again to see it. This is the
 * way back. Called "queues", not "tickets": to the person holding one, the
 * thing they are in is the queue.
 *
 * Built from what the device already remembers (`myTickets`), so it costs no
 * server change. A ticket that has been served, removed or left drops out of
 * the list and out of that memory the moment its row sees it.
 */
export function YourQueues() {
  const { t } = useT();
  // Read once: rows forget themselves as they go stale, and hide on their own.
  const [held] = useState(heldTickets);
  const [gone, setGone] = useState<Set<string>>(() => new Set());

  const live = held.filter((h) => !gone.has(h.ticketId));
  if (live.length === 0) return null;

  return (
    <section className="your-queues" aria-labelledby="your-queues-title">
      <h2 id="your-queues-title" className="eyebrow">
        {t('yourQueues.title')}
      </h2>
      <ul className="your-queue-list">
        {live.map((h) => (
          <HeldQueueRow
            key={h.ticketId}
            held={h}
            onGone={() =>
              setGone((prev) => new Set(prev).add(h.ticketId))
            }
          />
        ))}
      </ul>
    </section>
  );
}

function HeldQueueRow({
  held,
  onGone,
}: {
  held: HeldTicket;
  onGone: () => void;
}) {
  const { t, tn, locale } = useT();
  const { shopId, queueId, ticketId } = held;
  const ticket = useDoc(ticketDoc(shopId, queueId, ticketId));
  const queue = useDoc(queueDoc(shopId, queueId));
  const waiting = ticket.data?.state === 'waiting';
  const position = waiting ? (ticket.data?.position ?? null) : null;
  const { data: ahead } = useCollection(
    position === null ? null : ticketsAhead(shopId, queueId, position),
    `${shopId}/${queueId}/ahead/${position}`,
  );
  const { data: stations } = useCollection(
    waiting ? stationsOf(shopId, queueId) : null,
    `${shopId}/${queueId}/stations`,
  );

  const active =
    ticket.data?.state === 'waiting' || ticket.data?.state === 'serving';
  const finished = !ticket.loading && !ticket.error && !active;

  useEffect(() => {
    if (!finished) return;
    forgetTicket(shopId, queueId);
    onGone();
    // onGone is a fresh closure each render; the row only needs to go once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, shopId, queueId]);

  if (!active || !queue.data) return null;

  const q = queue.data;
  let headline: string;
  let detail: string;
  if (ticket.data?.state === 'serving') {
    headline = t('ticketView.yourTurn');
    detail = '';
  } else {
    const peopleAhead = ahead?.length ?? 0;
    const serviceTime = q.observedServiceTimeSeconds ?? q.avgServiceTimeSeconds;
    const wait = Math.round(
      (peopleAhead * serviceTime) / Math.max(1, stations?.length ?? 1),
    );
    headline =
      peopleAhead === 0
        ? t('yourQueues.next')
        : `${peopleAhead + 1}${formatOrdinalSuffix(peopleAhead + 1, locale)}`;
    detail =
      peopleAhead === 0
        ? t('ticketView.calledAnyMoment')
        : `${tn(peopleAhead, 'ticketView.peopleAhead')} · ${formatWaitCompact(wait, t)}`;
  }

  return (
    <li>
      <LocalizedLink className="your-queue" to={`/q/${shopId}/${queueId}`}>
        <span className="your-queue-names">
          <strong>{q.shopName}</strong>
          {q.name && <span>{q.name}</span>}
        </span>
        <span className="your-queue-place">
          <span className="your-queue-headline">{headline}</span>
          {detail && <span className="your-queue-detail">{detail}</span>}
        </span>
      </LocalizedLink>
    </li>
  );
}
