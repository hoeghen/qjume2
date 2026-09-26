import { useT } from '../../../lib/i18n/LanguageContext.js';
import type { QueueStatus } from '../../../types/index.js';

const BANNER_STATUSES: QueueStatus[] = ['paused', 'drainMode', 'unavailable', 'closed'];

/**
 * A paused queue that nobody notices is worse than a closed one: customers keep
 * waiting for a turn that is not coming. The state has to be impossible to miss
 * from across a counter, which is why this is a full-width bar and not a chip.
 */
export function PauseBanner({ status }: { status: QueueStatus }) {
  const { t } = useT();
  if (!BANNER_STATUSES.includes(status)) return null;

  return (
    <div className={`status-banner status-${status}`} role="status">
      <strong>{t(`shop.pauseBanner.${status}.label`)}</strong>
      <span>{t(`shop.pauseBanner.${status}.detail`)}</span>
    </div>
  );
}
