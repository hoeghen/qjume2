import type { Locale } from './i18n/locale.js';

/**
 * The price comparison on `/koesystemer`, written once for the page and for
 * the build's static text (seoBody.ts).
 *
 * Every figure here was read off the supplier's own website on
 * `PRICES_CHECKED` — never estimated. A comparison with stale or guessed
 * prices is misleading marketing (markedsføringsloven), so when a price
 * changes, or can no longer be confirmed, change or drop the row and move
 * the date.
 */
export const PRICES_CHECKED: Record<Locale, string> = {
  da: '16. oktober 2026',
  en: '16 October 2026',
};

export interface SupplierRow {
  name: string;
  url: string | null;
  type: Record<Locale, string>;
  price: Record<Locale, string>;
  /** The row for Qjume itself, picked out on the page. */
  ours?: boolean;
}

export const SUPPLIERS: SupplierRow[] = [
  {
    name: 'Ikast Etiket',
    url: 'https://www.ikastetiket.dk/koenummersystem',
    type: { da: 'Papir-kønumre, ruller à 1.000 numre', en: 'Paper ticket numbers, rolls of 1,000' },
    price: { da: '162,50 kr inkl. moms pr. stk.', en: '162.50 kr incl. VAT each' },
  },
  {
    name: 'VX3 startsæt (Retailonline)',
    url: 'https://www.retailonline.dk/produkt/butikstilbehoer/koe-system/koe-nummersystem-vx3/',
    type: { da: 'Kønummersystem: automat, display og billetter', en: 'Ticket system: dispenser, display and tickets' },
    price: { da: '2.999 kr ekskl. moms', en: '2,999 kr excl. VAT' },
  },
  {
    name: 'CTcoin EWQ-100',
    url: 'https://www.ctcoin.dk/shop/koesystemer/',
    type: { da: 'Trådløs elektronisk køstyring med rapportering', en: 'Wireless electronic queue management with reports' },
    price: {
      da: '19.995 kr ekskl. moms, plus billetter og displays',
      en: '19,995 kr excl. VAT, plus tickets and displays',
    },
  },
  {
    name: 'Visual Display',
    url: 'https://visualdisplay.dk/koesystemer',
    type: { da: 'Elektroniske og virtuelle køsystemer, også til leje', en: 'Electronic and virtual queue systems, also for hire' },
    price: { da: 'Efter tilbud', en: 'On request' },
  },
  {
    name: 'Qmatic',
    url: 'https://www.qmatic.com/',
    type: { da: 'Stort system: kiosker, skærme, booking og cloud', en: 'Large system: kiosks, screens, booking and cloud' },
    price: { da: 'Efter tilbud', en: 'On request' },
  },
  {
    name: 'Waitwhile',
    url: 'https://waitwhile.com/pricing',
    type: { da: 'Digital venteliste og booking (USA)', en: 'Digital waitlist and booking (US)' },
    price: {
      da: 'Gratis til 50 besøg/md., derefter fra $31/md.',
      en: 'Free up to 50 visits/month, then from $31/month',
    },
  },
  {
    name: 'Qminder',
    url: 'https://www.qminder.com/pricing/',
    type: { da: 'Digitalt køsystem til større organisationer', en: 'Digital queue system for larger organisations' },
    price: { da: 'Fra $869/md.', en: 'From $869/month' },
  },
  {
    name: 'Qjume',
    url: null,
    ours: true,
    type: { da: 'Digitalt QR-køsystem uden app og hardware', en: 'Digital QR queue system, no app or hardware' },
    price: {
      da: 'Gratis til 1000 betjente kunder, derefter 100 kr/md. ekskl. moms',
      en: 'Free for 1000 served customers, then 100 kr/month excl. VAT',
    },
  },
];

/** The FAQ on `/koesystemer`, by string key, for the page and its JSON-LD. */
export const QUEUE_SYSTEMS_FAQ = [1, 2, 3, 4, 5] as const;
