import type { Locale } from './i18n/locale.js';
import { COMPANY } from './company.js';
import { en } from './i18n/en.js';
import { INDUSTRIES, industryPath } from './industries.js';
import { da as daStrings } from './i18n/da.js';
import { FREE_SERVICES_DEFAULT, SUBSCRIPTION_PRICE_DKK } from '../types/limits.js';

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
      title: 'Digitalt køsystem uden app og papir | Qjume',
      description:
        'Qjume er et digitalt køsystem til butikker og klinikker. Kunder scanner en QR-kode og venter hvor de vil. Gratis for de første 1000 kunder, derefter 100 kr/md.',
    },
    en: {
      title: 'Digital queue system, no app or paper | Qjume',
      description:
        'Qjume is a digital queue system for shops and clinics. Customers scan a QR code and wait wherever they like. Free for the first 1000 customers, then 100 kr/month.',
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
  '/koesystemer': {
    da: {
      title: 'Køsystemer i Danmark — guide og priser | Qjume',
      description:
        'Sammenlign kønummersystemer, elektronisk køstyring og digitale køsystemer. Priser, fordele og ulemper — og hvad der passer til din butik eller klinik.',
    },
    en: {
      title: 'Queue systems in Denmark — guide and prices | Qjume',
      description:
        'Compare ticket number systems, electronic queue management and digital queue systems. Prices, pros and cons — and what suits your shop or clinic.',
    },
  },
  '/brancher': {
    da: {
      title: 'Køsystem til din branche — bager, apotek, frisør m.fl. | Qjume',
      description:
        'Digitalt køsystem til bager, slagter, apotek, frisør, dyrlæge, værksted, klinik og mange flere. Se hvordan Qjume passer til netop din branche.',
    },
    en: {
      title: 'A queue system for your industry | Qjume',
      description:
        'A digital queue system for bakeries, butchers, pharmacies, hairdressers, vets, garages, clinics and more. See how Qjume fits your trade.',
    },
  },
  ...Object.fromEntries(
    INDUSTRIES.map((i) => [
      industryPath(i),
      {
        da: { title: i.title.da, description: i.description.da },
        en: { title: i.title.en, description: i.description.en },
      },
    ]),
  ),
  '/terms': {
    da: { title: 'Vilkår — Qjume', description: 'Vilkårene for at bruge Qjume.' },
    en: { title: 'Terms — Qjume', description: 'The terms for using Qjume.' },
  },
  '/info': {
    da: {
      title: 'Info — Qjume',
      description: 'Qjume drives af Bitwork, CVR 37653837, Raagaards Alle 15, 2791 Dragør. Skriv til info@qjume.dk.',
    },
    en: {
      title: 'Info — Qjume',
      description: 'Qjume is run by Bitwork, CVR 37653837, Raagaards Alle 15, 2791 Dragør, Denmark. Write to info@qjume.dk.',
    },
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

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/**
 * Search engines' and AI models' description of the service, on the home
 * page. No `aggregateRating`: there is none to give yet, and an invented one
 * breaks Google's rules. The free services are a count, not a trial period,
 * so they are an offer of their own at 0 with an `eligibleQuantity`.
 */
export function structuredData(locale: Locale): string {
  const da = locale === 'da';
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: COMPANY.name,
        brand: { '@type': 'Brand', name: SITE_NAME },
        url: `${SITE_URL}/`,
        logo: SHARE_IMAGE,
        email: COMPANY.email,
        vatID: `DK${COMPANY.cvr}`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: COMPANY.street,
          postalCode: COMPANY.postcode,
          addressLocality: COMPANY.city,
          addressCountry: 'DK',
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#software`,
        name: da ? 'Qjume – digitalt køsystem' : 'Qjume – digital queue system',
        alternateName: da ? ['Qjume køsystem', 'Qjume kønummersystem'] : ['Qjume queue system'],
        url: localizedUrl('/', locale),
        image: SHARE_IMAGE,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: da ? 'Køsystem / køstyring' : 'Queue management',
        operatingSystem: 'Web, iOS, Android',
        inLanguage: ['da', 'en'],
        isAccessibleForFree: true,
        description: da
          ? 'Qjume er et papirløst, QR-baseret digitalt køsystem til butikker og klinikker i Danmark. Kunderne stiller sig i kø fra browseren uden app eller login, ser deres plads live og får besked, når det er deres tur. Erstatter kønummersystemer og billetautomater uden hardware.'
          : 'Qjume is a paperless, QR-based digital queue system for shops and clinics in Denmark. Customers join from the browser with no app or login, see their place live and are told when it is their turn. Replaces ticket number systems and ticket machines with no hardware.',
        featureList: da
          ? [
              'Digital kø via QR-kode – ingen app og intet login for kunden',
              'Live position og forventet ventetid',
              'Notifikationer via push og e-mail',
              'Flere køer og flere kasser pr. forretning',
              'Walk-ins kan tilføjes af personalet ved skranken',
              'Monitor-skærm med kø og QR-kode til venteområdet',
              'Personale-adgang og automatisk håndtering af no-shows',
              'Dansk og engelsk',
              'Ingen hardware eller installation',
            ]
          : [
              'Digital queue via QR code – no app and no login for the customer',
              'Live place in the queue and estimated wait',
              'Push and email notifications',
              'Several queues and tills per business',
              'Staff can add walk-ins at the counter',
              'Monitor screen with the queue and a QR code for the waiting area',
              'Staff access and automatic no-show handling',
              'Danish and English',
              'No hardware or installation',
            ],
        publisher: { '@id': ORGANIZATION_ID },
        offers: [
          {
            '@type': 'Offer',
            name: da ? 'Gratis – de første 1000 betjente kunder' : 'Free – the first 1000 served customers',
            price: '0',
            priceCurrency: 'DKK',
            availability: 'https://schema.org/InStock',
            url: localizedUrl('/intro', locale),
            eligibleQuantity: {
              '@type': 'QuantitativeValue',
              maxValue: FREE_SERVICES_DEFAULT,
              unitText: da ? 'betjente kunder' : 'served customers',
            },
          },
          {
            '@type': 'Offer',
            name: da ? 'Abonnement' : 'Subscription',
            price: String(SUBSCRIPTION_PRICE_DKK),
            priceCurrency: 'DKK',
            availability: 'https://schema.org/InStock',
            url: localizedUrl('/intro', locale),
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: String(SUBSCRIPTION_PRICE_DKK),
              priceCurrency: 'DKK',
              valueAddedTaxIncluded: false,
              referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
            },
          },
        ],
      },
    ],
  });
}

/** The guide's FAQ and breadcrumb, on `/koesystemer`. */
export function queueSystemsStructuredData(locale: Locale, faq: { q: string; a: string }[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: localizedUrl('/', locale) },
          {
            '@type': 'ListItem',
            position: 2,
            name: locale === 'da' ? 'Køsystemer' : 'Queue systems',
            item: localizedUrl('/koesystemer', locale),
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
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
  if (path === '/koesystemer') {
    const strings = (locale === 'da' ? daStrings.queueSystems : undefined) ?? en.queueSystems;
    const faq = ([1, 2, 3, 4, 5] as const).map((n) => ({
      q: strings[`faq${n}Q`] ?? en.queueSystems[`faq${n}Q`],
      a: strings[`faq${n}A`] ?? en.queueSystems[`faq${n}A`],
    }));
    tags.push(`<script type="application/ld+json">${queueSystemsStructuredData(locale, faq)}</script>`);
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
