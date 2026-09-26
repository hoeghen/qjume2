import type { TFunction } from './i18n/LanguageContext.js';

/** "about 25 min", "about 1 hr 10 min", "no wait". */
export function formatWait(seconds: number, t: TFunction): string {
  if (seconds <= 0) return t('format.noWait');
  // Checked before rounding: 30s rounds up to 1 minute, which would read as a
  // wait when there is barely one.
  if (seconds < 60) return t('format.lessThanMinute');
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t('format.aboutMinutes', { minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? t('format.aboutHours', { hours })
    : t('format.aboutHoursMinutes', { hours, minutes: rest });
}

/**
 * The same number without the hedge, for places where it sits in a column of
 * figures rather than in a sentence — the design's list rows read "6 min".
 */
export function formatWaitCompact(seconds: number, t: TFunction): string {
  if (seconds <= 0) return t('format.noWait');
  if (seconds < 60) return t('format.lessThanMinuteCompact');
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t('format.minutesCompact', { minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? t('format.hoursCompact', { hours })
    : t('format.hoursMinutesCompact', { hours, minutes: rest });
}

// Units, not words — "m" and "km" read the same in Danish, so this needs no
// translation function.
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}
