import { Link } from 'react-router-dom';
import type { DiscoveredQueue } from '../../../lib/discovery.js';
import { formatDistance } from '../../../lib/format.js';
import type { QueueStatus } from '../../../types/index.js';

const STATUS_LABELS: Partial<Record<QueueStatus, string>> = {
  drainMode: 'Closing soon',
  paused: 'Paused',
  unavailable: 'Temporarily unavailable',
  closed: 'Closed',
};

/**
 * Deliberately light: shop name and address only, per PRD 4.1. Waiting counts
 * and estimates live behind the tap-through, so the list stays scannable.
 */
export function QueueCard({
  queue,
  showDistance,
}: {
  queue: DiscoveredQueue;
  showDistance: boolean;
}) {
  const status = STATUS_LABELS[queue.status];

  return (
    <li className="queue-card">
      <Link to={`/q/${queue.shopId}/${queue.id}`}>
        <div className="queue-card-main">
          <strong>{queue.shopName}</strong>
          <p className="muted">{queue.address}</p>
        </div>
        <div className="queue-card-meta">
          {showDistance && (
            <span className="distance">{formatDistance(queue.distanceKm)}</span>
          )}
          {status && <span className={`badge status-${queue.status}`}>{status}</span>}
        </div>
      </Link>
    </li>
  );
}
