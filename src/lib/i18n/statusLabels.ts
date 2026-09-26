import type { QueueStatus } from '../../types/index.js';
import type { TFunction } from './LanguageContext.js';

/** The only statuses worth a badge — an open queue needs no label at all. */
const BADGE_STATUSES: QueueStatus[] = ['drainMode', 'paused', 'unavailable', 'closed'];

/** `null` for a status (like `open`) that carries no badge. */
export function statusBadgeLabel(t: TFunction, status: QueueStatus): string | null {
  return BADGE_STATUSES.includes(status) ? t(`status.badge.${status}`) : null;
}
