/**
 * Which ticket this device holds in a given queue.
 *
 * Kept locally because a customer is anonymous by default: there is no account
 * to hang it off. Losing it is survivable — that is what the resume code is
 * for — so every access tolerates storage being unavailable.
 */
const KEY = 'qjume:tickets';

type Held = Record<string, string>;

function read(): Held {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Held) : {};
  } catch {
    return {};
  }
}

function write(held: Held): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(held));
  } catch {
    // Private browsing refuses storage; the resume code is the fallback.
  }
}

const keyOf = (shopId: string, queueId: string) => `${shopId}/${queueId}`;

export function rememberTicket(
  shopId: string,
  queueId: string,
  ticketId: string,
): void {
  write({ ...read(), [keyOf(shopId, queueId)]: ticketId });
}

export function heldTicket(shopId: string, queueId: string): string | null {
  return read()[keyOf(shopId, queueId)] ?? null;
}

export function forgetTicket(shopId: string, queueId: string): void {
  const held = read();
  delete held[keyOf(shopId, queueId)];
  write(held);
}
