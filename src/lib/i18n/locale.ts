/**
 * The URL's first path segment picks the language: `/da/...` is Danish,
 * anything else (no prefix, or a prefix that isn't a real locale) is
 * English. Not a redirect - the two live as sibling branches of the same
 * route tree (see src/router.tsx), so a plain `/find` renders English
 * directly rather than bouncing through `/en/find`.
 */
export const DEFAULT_LOCALE = 'en';
export const LOCALES = ['en', 'da'] as const;
export type Locale = (typeof LOCALES)[number];

export function detectLocaleFromPath(pathname: string): Locale {
  const first = pathname.split('/').filter(Boolean)[0];
  return first === 'da' ? 'da' : DEFAULT_LOCALE;
}

/**
 * Prefixes an internal path with the given locale, or strips down to the
 * unprefixed (English) form - the inverse operation, used by the language
 * switcher to point at the same page in the other language.
 *
 * Only ever touches absolute in-app paths. `mailto:`, `https://` and the
 * like pass through untouched - there is nothing to localize about them.
 */
export function withLocale(path: string, locale: Locale): string {
  if (!path.startsWith('/')) return path;
  const withoutExistingPrefix =
    path === '/da' || path.startsWith('/da/') ? path.slice(3) || '/' : path;
  if (locale === DEFAULT_LOCALE) return withoutExistingPrefix;
  return withoutExistingPrefix === '/'
    ? '/da'
    : `/da${withoutExistingPrefix}`;
}
