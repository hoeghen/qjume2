/**
 * The name and email last used to join a queue, so returning to join another
 * one doesn't ask for them again.
 *
 * Same tolerance as `myTickets.ts`: a customer is anonymous by default, this
 * is a convenience rather than anything load-bearing, and every access
 * tolerates storage being unavailable.
 */
const KEY = 'qjume:joinDetails';

interface JoinDetails {
  name: string;
  email: string;
}

const EMPTY: JoinDetails = { name: '', email: '' };

export function recalledJoinDetails(): JoinDetails {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<JoinDetails>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function rememberJoinDetails(details: JoinDetails): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(details));
  } catch {
    // Private browsing refuses storage; just asks again next time.
  }
}
