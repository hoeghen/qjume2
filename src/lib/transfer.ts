/**
 * Carrying a place in line from Safari into the Home Screen app on an iPhone.
 *
 * The two share no storage, and the web has no device identifier to match
 * them by, so the clipboard is the bridge: Safari copies a link holding a
 * single-use token (registered with `startTransfer`), and the installed app
 * pastes it and calls `claimTransfer`. It can fail quietly — the person may
 * copy something else in between — which is why the UI always pairs it with
 * "otherwise, join the queue again". See functions/src/queue/transferTicket.ts.
 */

export interface TransferPayload {
  shopId: string;
  queueId: string;
  ticketId: string;
  token: string;
}

/** 18 random bytes, base64url: 24 characters, well past guessing. */
export function newTransferToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * A link rather than a bare code, so that if it ends up pasted somewhere it
 * at least says what it is. The token sits in the fragment, which browsers
 * never send to a server.
 */
export function transferText(p: TransferPayload): string {
  const params = new URLSearchParams({
    s: p.shopId,
    q: p.queueId,
    t: p.ticketId,
    k: p.token,
  });
  return `${window.location.origin}/#qjume-transfer&${params.toString()}`;
}

export function parseTransfer(text: string): TransferPayload | null {
  const at = text.indexOf('#qjume-transfer&');
  if (at < 0) return null;
  const params = new URLSearchParams(text.slice(at + '#qjume-transfer&'.length).trim());
  const shopId = params.get('s');
  const queueId = params.get('q');
  const ticketId = params.get('t');
  const token = params.get('k');
  return shopId && queueId && ticketId && token
    ? { shopId, queueId, ticketId, token }
    : null;
}
