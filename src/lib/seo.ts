import type { Locale } from './i18n/locale.js';

/**
 * What search engines and link previews see, written once and used twice: by
 * the app at runtime (`applyPageMeta`), and by the build, which writes a real
 * HTML file per public page so a crawler or a chat app's link preview — which
 * runs no JavaScript — gets the right title and text (vite.config.ts).
 *
 * Plain data and string building only: the build imports this under Node.
 */
export const SITE_URL = 'https://qjume.dk';
export const SITE_NAME = 'Qjume';
/** Square, but it is what there is; previews crop it sensibly. */
export const SHARE_IMAGE = `${SITE_URL}/icon-512.png`;

export interface PageMeta {
  title: string;
  description: string;
}

type Words = Record<Locale, PageMeta>;

/**
 * The public pages worth finding, by unprefixed path. Anything not here is
 * either per-shop (`/s/:shopId`, worded by the page itself) or not for
 * search at all — the owner's, the admin's and the monitor's pages are kept
 * out by robots.txt.
 */
export const SEO_PAGES: Record<string, Words> = {
  '/': {
    da: {
      title: 'Qjume — stil dig i kø hvor som helst fra',
      description:
        'Se ventetiden, stil dig i kø fra telefonen og få besked, når det er din tur. Gratis for kunder — og nemt for butikker at styre deres kø.',
    },
    en: {
      title: 'Qjume — join the queue from anywhere',
      description:
        'See the wait, join the queue from your phone and get told when it is your turn. Free for customers — and easy for shops to run their queue.',
    },
  },
  '/find': {
    da: {
      title: 'Find en kø nær dig — Qjume',
      description:
        'Se køer i nærheden med ventetid og antal ventende, og stil dig i kø uden at stå i den.',
    },
    en: {
      title: 'Find a queue near you — Qjume',
      description:
        'See queues nearby with their wait and how many are waiting, and join without standing in line.',
    },
  },
  '/intro': {
    da: {
      title: 'Digitalt køsystem til din butik — Qjume',
      description:
        'Kunderne venter, hvor de vil, og får besked, når det er deres tur. Til butikker, klinikker og events. Gratis for de første 1000 betjeninger.',
    },
    en: {
      title: 'A digital queue system for your shop — Qjume',
      description:
        'Customers wait wherever they like and are told when it is their turn. For shops, clinics and events. Free for the first 1000 services.',
    },
  },
  '/terms': {
    da: { title: 'Vilkår — Qjume', description: 'Vilkårene for at bruge Qjume.' },
    en: { title: 'Terms — Qjume', description: 'The terms for using Qjume.' },
  },
  '/privacy': {
    da: {
      title: 'Privatlivspolitik — Qjume',
      description: 'Hvilke oplysninger Qjume gemmer, hvorfor, og hvor længe.',
    },
    en: {
      title: 'Privacy policy — Qjume',
      description: 'What Qjume stores, why, and for how long.',
    },
  },
};

/** A shop's public page, `/s/:shopId`. */
export function shopPageMeta(shopName: string, locale: Locale): PageMeta {
  return locale === 'da'
    ? {
        title: `${shopName} — kø på Qjume`,
        description: `Se ventetiden hos ${shopName}, og stil dig i kø fra telefonen.`,
      }
    : {
        title: `${shopName} — queue on Qjume`,
        description: `See the wait at ${shopName} and join the queue from your phone.`,
      };
}

/** The page's address in one language: Danish unprefixed, English under /en. */
export function localizedUrl(path: string, locale: Locale): string {
  if (locale === 'da') return `${SITE_URL}${path}`;
  return `${SITE_URL}/en${path === '/' ? '' : path}`;
}

/** Search engines' description of the service, on the home page. */
export function structuredData(locale: Locale): string {
  const meta = SEO_PAGES['/']![locale];
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: localizedUrl('/', locale),
    description: meta.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: locale,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'DKK' },
    publisher: { '@type': 'Organization', name: 'Bitwork.dk', email: 'bitwork@gmail.com' },
  });
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * The head tags for one page, as HTML — what the build writes into each
 * page's own file. The runtime sets the same tags on the live document.
 */
export function headHtml(path: string, locale: Locale, meta: PageMeta): string {
  const url = localizedUrl(path, locale);
  const tags = [
    `<title>${escape(meta.title)}</title>`,
    `<meta name="description" content="${escape(meta.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" hreflang="da" href="${localizedUrl(path, 'da')}" />`,
    `<link rel="alternate" hreflang="en" href="${localizedUrl(path, 'en')}" />`,
    `<link rel="alternate" hreflang="x-default" href="${localizedUrl(path, 'da')}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escape(meta.title)}" />`,
    `<meta property="og:description" content="${escape(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SHARE_IMAGE}" />`,
    `<meta property="og:locale" content="${locale === 'da' ? 'da_DK' : 'en_GB'}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ];
  if (path === '/') {
    tags.push(`<script type="application/ld+json">${structuredData(locale)}</script>`);
  }
  return tags.join('\n    ');
}

/**
 * The head of `app.html`, the file Firebase serves for every path without a
 * page of its own — a shop's page, a queue, the owner's screens. No canonical
 * and no address: that file is the same bytes for every one of those paths,
 * and a canonical pointing at the home page would tell Google that a shop's
 * page is a copy of it. The app sets the real tags once it knows the page.
 */
export function appHeadHtml(): string {
  const meta = SEO_PAGES['/']!.da;
  return [
    `<title>${SITE_NAME}</title>`,
    `<meta name="description" content="${escape(meta.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:image" content="${SHARE_IMAGE}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join('\n    ');
}

/** Every public page in both languages, linked to each other. */
export function sitemapXml(lastmod: string): string {
  const entries = Object.keys(SEO_PAGES).flatMap((path) =>
    (['da', 'en'] as const).map(
      (locale) => `  <url>
    <loc>${localizedUrl(path, locale)}</loc>
    <lastmod>${lastmod}</lastmod>
    <xhtml:link rel="alternate" hreflang="da" href="${localizedUrl(path, 'da')}" />
    <xhtml:link rel="alternate" hreflang="en" href="${localizedUrl(path, 'en')}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${localizedUrl(path, 'da')}" />
  </url>`,
    ),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;
}
