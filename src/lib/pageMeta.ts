import type { Locale } from './i18n/locale.js';
import { localizedUrl, SEO_PAGES, SITE_NAME, type PageMeta } from './seo.js';

/**
 * Keep the live document's head in step with the page shown — the same tags
 * the build writes into each public page's own HTML file (src/lib/seo.ts).
 * Google renders the app and reads these; the static files cover everything
 * that does not run JavaScript.
 */

function upsert(selector: string, create: () => HTMLElement, set: (el: HTMLElement) => void) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  set(el);
}

function meta(attr: 'name' | 'property', key: string, content: string) {
  upsert(
    `meta[${attr}="${key}"]`,
    () => {
      const el = document.createElement('meta');
      el.setAttribute(attr, key);
      return el;
    },
    (el) => el.setAttribute('content', content),
  );
}

function link(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  upsert(
    selector,
    () => {
      const el = document.createElement('link');
      el.setAttribute('rel', rel);
      if (hreflang) el.setAttribute('hreflang', hreflang);
      return el;
    },
    (el) => el.setAttribute('href', href),
  );
}

/** Set the head for `path` (unprefixed) in `locale`. */
export function applyPageMeta(path: string, locale: Locale, page: PageMeta): void {
  const url = localizedUrl(path, locale);
  document.title = page.title;
  meta('name', 'description', page.description);
  link('canonical', url);
  link('alternate', localizedUrl(path, 'da'), 'da');
  link('alternate', localizedUrl(path, 'en'), 'en');
  link('alternate', localizedUrl(path, 'da'), 'x-default');
  meta('property', 'og:title', page.title);
  meta('property', 'og:description', page.description);
  meta('property', 'og:url', url);
  meta('property', 'og:locale', locale === 'da' ? 'da_DK' : 'en_GB');
}

/**
 * The head for a page that is not one of the listed public ones: just the
 * name and the home page's description. A shop's page words its own.
 */
export function defaultPageMeta(locale: Locale): PageMeta {
  return { title: SITE_NAME, description: SEO_PAGES['/']![locale].description };
}
