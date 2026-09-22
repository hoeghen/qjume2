import { Link, useParams } from 'react-router-dom';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { shopDoc } from '../../lib/firestore/paths.js';
import { queuesOf } from '../../lib/firestore/queries.js';
import { estimatedWaitSeconds } from '../../lib/discovery.js';
import { formatWaitCompact } from '../../lib/format.js';
import { CategoryIcon } from '../../components/CategoryIcon.js';
import type { QueueStatus } from '../../types/index.js';

const STATUS_LABELS: Partial<Record<QueueStatus, string>> = {
  drainMode: 'Closing soon',
  paused: 'Paused',
  unavailable: 'Temporarily unavailable',
  closed: 'Closed',
};

/** Open lines first: a shut one is not what someone came here to find. */
const OPEN_FIRST: QueueStatus[] = ['open', 'drainMode'];

/**
 * Every queue at one shop.
 *
 * A pharmacy running prescriptions, vaccinations and collections is one place
 * with three lines, and discovery shows those as three separate rows. This is
 * where that shop is a single thing again — reached from the shop's name on a
 * queue, or from "N other queues".
 */
export function ShopQueues() {
  const { shopId = '' } = useParams();
  const shop = useDoc(shopId ? shopDoc(shopId) : null);
  const { data: queues, loading } = useCollection(
    shopId ? queuesOf(shopId) : null,
    `${shopId}/queues`,
  );

  if (shop.loading || loading) return <p>Loading…</p>;

  // The shop's name lives on its own document, but every queue carries a copy
  // for discovery, so either will do and one of them is always there.
  const name = shop.data?.name ?? queues?.[0]?.shopName ?? null;
  if (!name) return <p>This shop no longer exists.</p>;

  const address = queues?.[0]?.address ?? null;
  const sorted = [...(queues ?? [])].sort((a, b) => {
    const openA = OPEN_FIRST.includes(a.status) ? 0 : 1;
    const openB = OPEN_FIRST.includes(b.status) ? 0 : 1;
    return openA - openB || a.name.localeCompare(b.name);
  });

  return (
    <main className="screen">
      <p>
        <Link to="/find" className="link">
          ← All queues
        </Link>
      </p>

      <div className="screen-intro">
        <h1>{name}</h1>
        {address && <p className="screen-lede">{address}</p>}
      </div>

      <h2>
        {sorted.length} {sorted.length === 1 ? 'queue' : 'queues'} here
      </h2>

      <ul className="queue-cards">
        {sorted.map((q) => {
          const status = STATUS_LABELS[q.status];
          return (
            <li className="queue-card" key={q.id}>
              <Link to={`/q/${shopId}/${q.id}`}>
                <CategoryIcon category={q.category} />
                <div className="queue-card-main">
                  <div className="queue-card-title">
                    <strong>{q.name}</strong>
                    {status && (
                      <span className={`badge status-${q.status}`}>
                        {status}
                      </span>
                    )}
                  </div>
                  {q.description && <p className="muted">{q.description}</p>}
                </div>
                <div className="queue-card-meta">
                  <span className="wait">
                    {formatWaitCompact(estimatedWaitSeconds(q))}
                  </span>
                  <span className="queue-card-stats">
                    {q.waitingCount} waiting
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
