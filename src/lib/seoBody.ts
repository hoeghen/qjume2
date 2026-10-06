import { en } from './i18n/en.js';
import { da } from './i18n/da.js';
import type { Locale } from './i18n/locale.js';
import { localizedUrl, SEO_PAGES } from './seo.js';

/**
 * The visible content of each public page, as plain HTML, for the build to put
 * inside `#root` of that page's own file (vite.config.ts). React replaces it
 * the moment the app starts, so visitors never notice; it is there for
 * anything that reads the HTML without running JavaScript — an SEO checker
 * found "0 words, no H1" — and for the first moment of a slow load.
 *
 * Worded from the same strings the app shows (`da.ts`/`en.ts`), so the two
 * cannot drift apart: what a crawler reads is what a visitor reads.
 */

type Dict = Record<string, unknown>;

/** A string at `path` in the locale's strings, falling back to English. */
function text(locale: Locale, path: string): string | null {
  const lookup = (root: unknown) =>
    path.split('.').reduce<unknown>((node, key) => (node as Dict | undefined)?.[key], root);
  const found = (locale === 'da' ? lookup(da) : undefined) ?? lookup(en);
  return typeof found === 'string' ? found : null;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const t = (locale: Locale, path: string) => esc(text(locale, path) ?? '');

const href = (path: string, locale: Locale) => esc(localizedUrl(path, locale).replace(/^https:\/\/[^/]+/, '') || '/');

/** A legal page: its title, its opening, and every numbered section. */
function legal(locale: Locale, doc: 'terms' | 'privacy'): string {
  const base = `legal.${doc}`;
  const intro =
    doc === 'terms'
      ? t(locale, `${base}.intro`)
      : `${t(locale, `${base}.introBefore`)}bitwork@gmail.com${t(locale, `${base}.introAfter`)}`;
  const sections: string[] = [];
  for (let n = 1; n <= 20; n++) {
    const heading = text(locale, `${base}.s${n}Heading`);
    if (!heading) continue;
    const body = text(locale, `${base}.s${n}Body`);
    sections.push(`<h2>${esc(heading)}</h2>${body ? `<p>${esc(body)}</p>` : ''}`);
  }
  return `<h1>${t(locale, `${base}.title`)}</h1><p>${intro}</p>${sections.join('')}`;
}

function main(path: string, locale: Locale): string {
  switch (path) {
    case '/':
      return `<h1>Qjume</h1>
<p>${t(locale, 'splash.lede')}</p>
<h2><a href="${href('/find', locale)}">${t(locale, 'splash.join')}</a></h2>
<p>${t(locale, 'discovery.lede')}</p>
<h2><a href="${href('/intro', locale)}">${t(locale, 'intro.title')}</a></h2>
<p>${t(locale, 'intro.step2Title')} ${t(locale, 'intro.step2')}</p>
<p>${t(locale, 'intro.price')}</p>`;
    case '/find':
      return `<h1>${t(locale, 'discovery.titleLight')} ${t(locale, 'discovery.titleRest')}</h1>
<p>${t(locale, 'discovery.lede')}</p>`;
    case '/intro':
      return `<h1>${t(locale, 'intro.title')}</h1>
<ol>${[1, 2, 3]
        .map((n) => `<li><h2>${t(locale, `intro.step${n}Title`)}</h2><p>${t(locale, `intro.step${n}`)}</p></li>`)
        .join('')}</ol>
<p>${t(locale, 'intro.price')}</p>`;
    case '/terms':
      return legal(locale, 'terms');
    case '/privacy':
      return legal(locale, 'privacy');
    default:
      return '';
  }
}

/** Links to every public page in this language, and the page in the other. */
function nav(path: string, locale: Locale): string {
  const other: Locale = locale === 'da' ? 'en' : 'da';
  const links = Object.entries(SEO_PAGES).map(
    ([p, words]) => `<li><a href="${href(p, locale)}">${esc(words[locale].title)}</a></li>`,
  );
  links.push(
    `<li><a href="${href(path, other)}" hreflang="${other}">${other === 'da' ? 'Dansk' : 'English'}</a></li>`,
  );
  return `<nav><ul>${links.join('')}</ul></nav>`;
}

export function staticBodyHtml(path: string, locale: Locale): string {
  return `<div class="static-page"><main>${main(path, locale)}</main>${nav(path, locale)}</div>`;
}
