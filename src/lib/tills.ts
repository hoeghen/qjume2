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

/** The number in an automatic name ("Till 3" → 3), or null for a chosen one. */
export function automaticTillNumber(label: string): number | null {
  const match = AUTOMATIC.exec(label.trim());
  return match ? Number(match[1]) : null;
}

export function tillLabel(label: string, locale: Locale): string {
  const n = automaticTillNumber(label);
  return n === null ? label : `${WORD[locale]} ${n}`;
}

/**
 * The lowest number no automatic name uses yet, for the next till opened.
 * Counting the tills instead gave a duplicate once one could be deleted:
 * remove Till 2 of three, and the next one opened was a second "Till 3".
 */
export function nextTillNumber(labels: readonly string[]): number {
  const taken = new Set(labels.map(automaticTillNumber));
  let n = 1;
  while (taken.has(n)) n++;
  return n;
}
