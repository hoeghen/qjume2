import { LocalizedLink } from '../../../lib/i18n/LocalizedLink.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';
import type { DiscoveredQueue } from '../../../lib/discovery.js';
import { estimatedWaitSeconds } from '../../../lib/discovery.js';
import { formatDistance, formatWaitCompact } from '../../../lib/format.js';
import { CategoryIcon } from '../../../components/CategoryIcon.js';
import { statusBadgeLabel } from '../../../lib/i18n/statusLabels.js';

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
  const { t } = useT();
  const status = statusBadgeLabel(t, queue.status);
  const wait = estimatedWaitSeconds(queue);

  return (
    <li className="queue-card">
      <LocalizedLink to={`/q/${queue.shopId}/${queue.id}`}>
        <CategoryIcon category={queue.category} />

        <div className="queue-card-main">
          <div className="queue-card-title">
            <strong>{queue.shopName}</strong>
            {status && (
              <span className={`badge status-${queue.status}`}>{status}</span>
            )}
          </div>
          {/* Both names, and the queue's own carries weight: a pharmacy
              running prescriptions, vaccinations and collections is three
              rows whose only difference is this line. */}
          <p className="queue-card-line">
            <span className="queue-card-queue">{queue.name}</span>
            <span className="muted"> · {queue.address}</span>
          </p>
        </div>

        <div className="queue-card-meta">
          <span className="wait">{formatWaitCompact(wait, t)}</span>
          <span className="queue-card-stats">
            {showDistance && <>{formatDistance(queue.distanceKm)} · </>}
            {t('queueCard.waiting', { count: queue.waitingCount })}
          </span>
        </div>
      </LocalizedLink>
    </li>
  );
}
