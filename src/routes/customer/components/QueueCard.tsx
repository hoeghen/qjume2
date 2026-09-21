import { Link } from 'react-router-dom';
import type { DiscoveredQueue } from '../../../lib/discovery.js';
import { estimatedWaitSeconds } from '../../../lib/discovery.js';
import { formatDistance, formatWaitCompact } from '../../../lib/format.js';
import { CategoryIcon } from '../../../components/CategoryIcon.js';
import type { QueueStatus } from '../../../types/index.js';

const STATUS_LABELS: Partial<Record<QueueStatus, string>> = {
  drainMode: 'Closing soon',
  paused: 'Paused',
  unavailable: 'Temporarily unavailable',
  closed: 'Closed',
};

/**
 * A row in the discovery list.
 *
 * The wait and waiting count are on the row, per the design canvas. PRD 4.1
 * put them behind the tap-through to keep the list light — but the list can
 * already be *sorted* by wait, and a sort key you cannot see is a poor trade.
 * See CLAUDE.md.
 */
export function QueueCard({
  queue,
  showDistance,
}: {
  queue: DiscoveredQueue;
  showDistance: boolean;
}) {
  const status = STATUS_LABELS[queue.status];
  const wait = estimatedWaitSeconds(queue);

  return (
    <li className="queue-card">
      <Link to={`/q/${queue.shopId}/${queue.id}`}>
        <CategoryIcon category={queue.category} />

        <div className="queue-card-main">
          <div className="queue-card-title">
            <strong>{queue.shopName}</strong>
            {status && (
              <span className={`badge status-${queue.status}`}>{status}</span>
            )}
          </div>
          <p className="muted">{queue.address}</p>
        </div>

        <div className="queue-card-meta">
          <span className="wait">{formatWaitCompact(wait)}</span>
          <span className="queue-card-stats">
            {showDistance && <>{formatDistance(queue.distanceKm)} · </>}
            {queue.waitingCount} waiting
          </span>
        </div>
      </Link>
    </li>
  );
}
