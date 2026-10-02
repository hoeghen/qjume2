import type { ContactLocale } from '../../../src/types/index.js';

/**
 * Every notification's words, in each language a customer can choose.
 *
 * The language is the one stored on the ticket's contact — set when they
 * joined and updated when they turned notifications on — falling back to
 * Danish, the app's default. Kept in one place so a new notice cannot be
 * written in one language and forgotten in the other.
 */
export interface Words {
  title: string;
  body: string;
}

interface Messages {
  turn(name: string, shop: string, till: string | null): Words;
  bumped(name: string, shop: string, strikesLeft: number): Words;
  removed(name: string, shop: string, reason: 'noShows' | 'byShop'): Words;
  queueClosed(shop: string): Words;
  /** "3 people ahead", down to "You're next", with the estimate as one. */
  position(name: string, shop: string, peopleAhead: number, waitMinutes: number): Words;
}

export const DEFAULT_CONTACT_LOCALE: ContactLocale = 'da';

const da: Messages = {
  turn: (name, shop, till) => ({
    title: 'Det er din tur',
    body: till
      ? `${name}, gå til ${till} hos ${shop}.`
      : `${name}, du bliver kaldt op hos ${shop}.`,
  }),
  bumped: (name, shop, left) => ({
    title: 'Du missede din tur',
    body:
      `${name}, du blev kaldt op hos ${shop}, men var der ikke, så du er rykket tilbage. ` +
      `${left === 1 ? 'Én gang mere' : `${left} gange mere`}, og du mister din plads.`,
  }),
  removed: (name, shop, reason) => ({
    title: 'Du er ude af køen',
    body:
      reason === 'noShows'
        ? `${name}, du missede tre opkald hos ${shop}, så din plads er væk.`
        : `${name}, ${shop} har taget dig ud af køen.`,
  }),
  queueClosed: (shop) => ({
    title: 'Køen er lukket',
    body: `${shop} har lukket for nu. Beklager — kom gerne igen en anden gang.`,
  }),
  position: (name, shop, ahead, minutes) => {
    const caveat = 'Det er kun et skøn og kan ændre sig.';
    if (ahead === 0) {
      return {
        title: 'Du er den næste',
        body: `${name}, du er den næste i køen hos ${shop}. Anslået ventetid: når som helst. ${caveat}`,
      };
    }
    const people = ahead === 1 ? 'person' : 'personer';
    const wait = minutes < 1 ? 'under et minut' : `cirka ${minutes} min`;
    return {
      title: `${ahead} ${people} foran dig`,
      body: `${name}, der er ${ahead} ${people} foran dig hos ${shop}. Anslået ventetid: ${wait}. ${caveat}`,
    };
  },
};

const en: Messages = {
  turn: (name, shop, till) => ({
    title: 'It’s your turn',
    body: till
      ? `${name}, please go to ${till} at ${shop}.`
      : `${name}, you’re being called at ${shop}.`,
  }),
  bumped: (name, shop, left) => ({
    title: 'You missed your turn',
    body:
      `${name}, you were called at ${shop} and weren't there, ` +
      `so you've moved back. ${left} more and you lose your place.`,
  }),
  removed: (name, shop, reason) => ({
    title: 'You have left the queue',
    body:
      reason === 'noShows'
        ? `${name}, you missed three calls at ${shop}, so your place has gone.`
        : `${name}, ${shop} has taken you out of the queue.`,
  }),
  queueClosed: (shop) => ({
    title: 'Queue closed',
    body: `${shop} has closed for now. Sorry — do visit us next time.`,
  }),
  position: (name, shop, ahead, minutes) => {
    const caveat = 'This is only an estimate and can change.';
    if (ahead === 0) {
      return {
        title: 'You’re next',
        body: `${name}, you’re next in line at ${shop}. Estimated wait: any moment now. ${caveat}`,
      };
    }
    const wait = minutes < 1 ? 'under a minute' : `about ${minutes} min`;
    return {
      title: `${ahead} ${ahead === 1 ? 'person' : 'people'} ahead of you`,
      body:
        `${name}, ${ahead} ${ahead === 1 ? 'person is' : 'people are'} ` +
        `ahead of you at ${shop}. Estimated wait: ${wait}. ${caveat}`,
    };
  },
};

const MESSAGES: Record<ContactLocale, Messages> = { da, en };

export function messagesFor(locale: ContactLocale | null | undefined): Messages {
  return MESSAGES[locale ?? DEFAULT_CONTACT_LOCALE] ?? MESSAGES[DEFAULT_CONTACT_LOCALE];
}

/** Accepts only a language Qjume speaks; anything else becomes null. */
export function asContactLocale(value: unknown): ContactLocale | null {
  return value === 'da' || value === 'en' ? value : null;
}

/** Where a notice links: the queue page, in the customer's language. */
export function queueUrl(
  baseUrl: string,
  target: { shopId: string; queueId: string },
  locale: ContactLocale | null | undefined,
): string {
  const prefix = (locale ?? DEFAULT_CONTACT_LOCALE) === 'en' ? '/en' : '';
  return `${baseUrl}${prefix}/q/${target.shopId}/${target.queueId}`;
}
