import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { queueDoc } from '../../lib/firestore/paths.js';
import { queuesOf, stationsOf } from '../../lib/firestore/queries.js';
import { estimatedWaitSeconds } from '../../lib/discovery.js';
import { formatWait } from '../../lib/format.js';
import { CATEGORY_LABELS } from './components/Filters.js';
import { JoinQueue } from './JoinQueue.js';
import { TicketView } from './TicketView.js';
import { ResumeCodePrompt } from './components/ResumeCodePrompt.js';
import { ResumeForm } from './components/ResumeForm.js';
import { heldTicket } from '../../lib/myTickets.js';
import type { QueueStatus } from '../../types/index.js';

const STATUS_NOTES: Partial<Record<QueueStatus, string>> = {
  drainMode: 'Closing soon — not taking anyone new.',
  paused: 'Paused for a moment. Nobody is being called right now.',
  unavailable:
    'This shop is offline, so these numbers may be out of date and nobody new can join.',
  closed: 'Closed.',
};

export function QueueDetail() {
  const { shopId = '', queueId = '' } = useParams();
  const [params] = useSearchParams();
  // A QR code at the counter drops straight into the join form.
  const [joining, setJoining] = useState(params.get('join') === '1');
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

  if (queue.loading) return <p>Loading…</p>;
  if (!queue.data) return <p>This queue no longer exists.</p>;

  const q = queue.data;
  // A station with nobody assigned is still a staffed position; what matters
  // for the estimate is how many are being served in parallel.
  const activeStations = Math.max(1, stations?.length ?? 1);
  const wait = estimatedWaitSeconds(q, activeStations);
  const otherQueues = Math.max(0, (siblings?.length ?? 1) - 1);
  const note = STATUS_NOTES[q.status];
  const joinable = q.status === 'open';

  return (
    <main>
      <p>
        <Link to="/" className="link">
          ← All queues
        </Link>
      </p>

      <h1>{q.shopName}</h1>
      <p className="muted">{q.name}</p>

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
              {q.waitingCount === 1 ? 'person waiting' : 'people waiting'}
            </span>
          </div>
          <div>
            <span className="stat-value">{formatWait(wait)}</span>
            <span className="stat-label">estimated wait</span>
          </div>
        </section>
      )}

      {q.description && <p>{q.description}</p>}

      <dl className="detail">
        <dt>Address</dt>
        <dd>{q.address}</dd>

        <dt>Category</dt>
        <dd>{CATEGORY_LABELS[q.category]}</dd>

        {otherQueues > 0 && (
          <>
            <dt>Also at this shop</dt>
            <dd>
              {otherQueues} other {otherQueues === 1 ? 'queue' : 'queues'}
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
          onLeft={() => setTicketId(null)}
        />
      ) : joining ? (
        <JoinQueue
          shopId={shopId}
          queueId={queueId}
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
            title={note}
            onClick={() => setJoining(true)}
          >
            {joinable ? 'Join this queue' : 'Not taking joiners'}
          </button>
          {joinable && (
            <p className="hint">No account needed — just a name to be called by.</p>
          )}
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
