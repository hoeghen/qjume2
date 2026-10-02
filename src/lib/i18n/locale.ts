/**
 * The URL's first path segment picks the language. Danish is the default:
 * a plain `/find` renders Danish, `/en/...` is English. `/da/...` still
 * renders Danish too — it was the Danish prefix while English was the
 * default, and bookmarks, sign-in links and shared links already point at
 * it. Not a redirect: the branches are siblings in one route tree (see
 * src/router.tsx), so each renders directly.
 */
export const DEFAULT_LOCALE = 'da';
export const LOCALES = ['da', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** The prefixes the route tree recognises, default included for old links. */
const PREFIXES = ['en', 'da'] as const;

export function detectLocaleFromPath(pathname: string): Locale {
  const first = pathname.split('/').filter(Boolean)[0];
  return first === 'en' ? 'en' : DEFAULT_LOCALE;
}

/** The path with any language prefix removed: `/en/find` → `/find`. */
export function stripLocale(path: string): string {
  for (const prefix of PREFIXES) {
    if (path === `/${prefix}`) return '/';
    if (path.startsWith(`/${prefix}/`)) return path.slice(prefix.length + 1);
  }
  return path;
}

/**
 * Prefixes an internal path with the given locale, or strips down to the
 * unprefixed (Danish) form - the inverse operation, used by the language
 * switcher to point at the same page in the other language.
 *
 * Only ever touches absolute in-app paths. `mailto:`, `https://` and the
 * like pass through untouched - there is nothing to localize about them.
 */
export function withLocale(path: string, locale: Locale): string {
  if (!path.startsWith('/')) return path;
  const bare = stripLocale(path);
  if (locale === DEFAULT_LOCALE) return bare;
  return bare === '/' ? `/${locale}` : `/${locale}${bare}`;
}

/** True on the landing page in any language: `/`, `/en` or `/da`. */
export function isLandingPath(pathname: string): boolean {
  return stripLocale(pathname) === '/';
}
