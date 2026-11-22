import { stripLocale } from './i18n/locale.js';
import { INDUSTRY_PATH_PREFIX } from './industries.js';

/**
 * A short, stable name per route — not shown to customers or shop owners,
 * only to the platform admin (see `PageNameBadge`), so there is a quick,
 * unambiguous way to say "which screen" without a screenshot or a guess at
 * what the other person calls it.
 *
 * Matched against the de-localized path, in order, first match wins — most
 * specific patterns first where a route could otherwise be mistaken for a
 * parent (`/shop/q/new` before `/shop`).
 */
const PAGE_NAMES: readonly { pattern: RegExp; name: string }[] = [
  { pattern: /^\/$/, name: 'splash' },
  { pattern: /^\/find$/, name: 'find' },
  { pattern: /^\/q\/[^/]+\/[^/]+$/, name: 'queue-detail' },
  { pattern: /^\/s\/[^/]+$/, name: 'shop-queues' },
  { pattern: /^\/shop\/billing$/, name: 'shop-billing' },
  { pattern: /^\/shop\/settings$/, name: 'shop-settings' },
  { pattern: /^\/shop\/q\/new$/, name: 'queue-form-new' },
  { pattern: /^\/shop\/q\/[^/]+\/settings$/, name: 'queue-form-edit' },
  { pattern: /^\/shop\/q\/[^/]+\/serve$/, name: 'serving' },
  { pattern: /^\/shop$/, name: 'shop-index' },
  { pattern: /^\/monitor$/, name: 'monitor' },
  { pattern: /^\/intro$/, name: 'intro' },
  { pattern: /^\/koesystemer$/, name: 'queue-systems' },
  { pattern: /^\/brancher$/, name: 'industries' },
  {
    pattern: new RegExp(`^${INDUSTRY_PATH_PREFIX}.+$`),
    name: 'industry-page',
  },
  { pattern: /^\/terms$/, name: 'terms' },
  { pattern: /^\/privacy$/, name: 'privacy' },
  { pattern: /^\/info$/, name: 'info' },
  { pattern: /^\/admin\/log$/, name: 'admin-audit-log' },
  { pattern: /^\/admin\/shops\/[^/]+\/q\/[^/]+$/, name: 'admin-queue-edit' },
  { pattern: /^\/admin\/shops\/[^/]+$/, name: 'admin-shop-detail' },
  { pattern: /^\/admin$/, name: 'admin-shop-list' },
];

/** Falls back to the raw path itself for anything not listed above. */
export function pageName(pathname: string): string {
  const path = stripLocale(pathname);
  return PAGE_NAMES.find((p) => p.pattern.test(path))?.name ?? path;
}
