import { Link } from 'react-router-dom';
import { useCollection } from '../../lib/hooks/useFirestore.js';
import { queuesOf } from '../../lib/firestore/queries.js';
import { signOut } from '../../lib/auth.js';
import type { QueueStatus } from '../../types/index.js';

const STATUS_LABELS: Record<QueueStatus, string> = {
  open: 'Open',
  drainMode: 'Closing — walk-ins only',
  paused: 'Paused',
  unavailable: 'Offline',
  closed: 'Closed',
};

export function QueueList({
  shopId,
  shopName,
}: {
  shopId: string;
  shopName: string;
}) {
  const { data: queues, loading } = useCollection(
    queuesOf(shopId),
    `${shopId}/queues`,
  );

  return (
    <main className="panel">
      <header className="serving-header">
        <h1>{shopName}</h1>
        <span className="row tight">
          <Link className="link" to="/shop/billing">
            Plan
          </Link>
          <button type="button" className="link" onClick={() => void signOut()}>
            Sign out
          </button>
        </span>
      </header>

      {loading && <p>Loading…</p>}

      {!loading && queues?.length === 0 && (
        <p className="muted">No queues yet.</p>
      )}

      <ul className="queue-list">
        {queues?.map((q) => (
          <li key={q.id}>
            <div>
              <strong>{q.name}</strong>
              <span className={`badge status-${q.status}`}>
                {STATUS_LABELS[q.status]}
              </span>
              <p className="muted">
                {q.waitingCount} waiting · {q.address}
              </p>
            </div>
            <span className="row tight">
              <Link className="button" to={`/shop/q/${q.id}/serve`}>
                Serve
              </Link>
              <Link className="link" to={`/shop/q/${q.id}/settings`}>
                Settings
              </Link>
            </span>
          </li>
        ))}
      </ul>

      <Link className="button" to="/shop/q/new">
        New queue
      </Link>
    </main>
  );
}
