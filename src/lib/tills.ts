import type { Locale } from './i18n/locale.js';

/**
 * What a till is called on screen: "Kasse 2" in Danish, "Till 2" in English.
 *
 * A till nobody named is stored as "Till N" (`claimStation`) and has been
 * since before the app spoke Danish, so stored labels cannot be trusted to be
 * in the reader's language. An automatic name is therefore re-worded for
 * whoever reads it — staff, the monitor, the customer being called, their
 * notification — while a name the shop chose ("Skranke") is shown as typed.
 */
const AUTOMATIC = /^(?:till|kasse|station)\s+(\d+)$/i;

const WORD: Record<Locale, string> = { da: 'Kasse', en: 'Till' };

export function tillLabel(label: string, locale: Locale): string {
  const match = AUTOMATIC.exec(label.trim());
  return match ? `${WORD[locale]} ${match[1]}` : label;
}
