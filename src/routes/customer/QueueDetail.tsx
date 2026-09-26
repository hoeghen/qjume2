import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { queueDoc } from '../../lib/firestore/paths.js';
import { queuesOf, stationsOf } from '../../lib/firestore/queries.js';
import { estimatedWaitSeconds } from '../../lib/discovery.js';
import { formatWait } from '../../lib/format.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { JoinQueue } from './JoinQueue.js';
import { TicketView } from './TicketView.js';
import { ResumeCodePrompt } from './components/ResumeCodePrompt.js';
import { ResumeForm } from './components/ResumeForm.js';
import { heldTicket } from '../../lib/myTickets.js';
import type { QueueStatus } from '../../types/index.js';

const NOTE_STATUSES: QueueStatus[] = ['drainMode', 'paused', 'unavailable', 'closed'];

export function QueueDetail() {
  const { t, tn } = useT();
  const { shopId = '', queueId = '' } = useParams();
  const [params] = useSearchParams();
  // A QR code at the counter drops straight into the join form.
  const [joining, setJoining] = useState(params.get('join') === '1');
  // Scanned in the shop rather than followed from a link, so a draining queue
  // still takes them — the same rule staff get when adding a walk-in.
  const atCounter = params.get('at') === 'counter';
  const [ticketId, setTicketId] = useState<string | null>(() =>
    heldTicket(shopId, queueId),
  );
  const [freshCode, setFreshCode] = useState<string | null>(null);

  const queue = useDoc(shopId && queueId ? queueDoc(shopId, queueId) : null);
  const { data: stations } = useCollection(
    shopId && queueId ? stationsOf(shopId, queueId) : null,
    `${shopId}/${queueId}/stations`,
  );
  const { data: siblings } = useCollection(
    shopId ? queuesOf(shopId) : null,
    `${shopId}/queues`,
  );

  if (queue.loading) return <p>{t('common.loading')}</p>;
  if (!queue.data) return <p>{t('queueDetail.notFound')}</p>;

  const q = queue.data;
  // A station with nobody assigned is still a staffed position; what matters
  // for the estimate is how many are being served in parallel.
  const activeStations = Math.max(1, stations?.length ?? 1);
  const wait = estimatedWaitSeconds(q, activeStations);
  const otherQueues = Math.max(0, (siblings?.length ?? 1) - 1);
  const note = NOTE_STATUSES.includes(q.status) ? t(`status.note.${q.status}`) : null;
  // A platform suspension refuses a join regardless of the queue's own
  // status — checked here too so the button doesn't invite a tap that the
  // server would only then refuse. See CLAUDE.md decision 9.
  const joinable =
    !q.shopSuspended &&
    (q.status === 'open' || (atCounter && q.status === 'drainMode'));

  return (
    <main>
      <p>
        <LocalizedLink to="/find" className="link">
          {t('common.allQueues')}
        </LocalizedLink>
      </p>

      {/* The shop is a place with possibly several lines; its name leads to
          all of them. The queue's own name is what this page is about. */}
      <h1>
        <LocalizedLink to={`/s/${shopId}`} className="shop-link">
          {q.shopName}
        </LocalizedLink>
      </h1>
      <p className="queue-name">{q.name}</p>

      {note && (
        <p className={`status-banner status-${q.status}`} role="status">
          <span>{note}</span>
        </p>
      )}

      {/* Once someone holds a ticket, their own position and wait replace the
          queue-level figures. Showing both invites the reader to compare two
          numbers that answer different questions. */}
      {!ticketId && (
        <section className="stats">
          <div>
            <span className="stat-value">{q.waitingCount}</span>
            <span className="stat-label">
              {tn(q.waitingCount, 'queueDetail.peopleWaiting')}
            </span>
          </div>
          <div>
            <span className="stat-value">{formatWait(wait, t)}</span>
            <span className="stat-label">{t('queueDetail.estimatedWait')}</span>
          </div>
        </section>
      )}

      {q.description && <p>{q.description}</p>}

      <dl className="detail">
        <dt>{t('queueDetail.address')}</dt>
        <dd>{q.address}</dd>

        <dt>{t('queueDetail.category')}</dt>
        <dd>{t(`categories.${q.category}`)}</dd>

        {otherQueues > 0 && (
          <>
            <dt>{t('queueDetail.alsoAtShop')}</dt>
            <dd>
              <LocalizedLink to={`/s/${shopId}`} className="link">
                {tn(otherQueues, 'queueDetail.otherQueues')}
              </LocalizedLink>
            </dd>
          </>
        )}
      </dl>

      {ticketId ? (
        <TicketView
          shopId={shopId}
          queueId={queueId}
          ticketId={ticketId}
          queue={q}
          activeStations={activeStations}
          stations={stations ?? []}
          onLeft={() => setTicketId(null)}
        />
      ) : joining ? (
        <JoinQueue
          shopId={shopId}
          queueId={queueId}
          atCounter={atCounter}
          onJoined={(id, code) => {
            setTicketId(id);
            setJoining(false);
            setFreshCode(code);
          }}
          onCancel={() => setJoining(false)}
        />
      ) : (
        <>
          <button
            type="button"
            disabled={!joinable}
            title={note ?? undefined}
            onClick={() => setJoining(true)}
          >
            {joinable ? t('queueDetail.join') : t('queueDetail.notTakingJoiners')}
          </button>
          {joinable && <p className="hint">{t('queueDetail.joinHint')}</p>}
          <ResumeForm
            shopId={shopId}
            queueId={queueId}
            onClaimed={(id) => setTicketId(id)}
          />
        </>
      )}

      {freshCode && (
        <ResumeCodePrompt code={freshCode} onDismiss={() => setFreshCode(null)} />
      )}
    </main>
  );
}
