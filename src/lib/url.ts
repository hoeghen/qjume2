/**
 * An absolute URL for a route in this app.
 *
 * A QR code has to carry a URL that works when it is scanned by a phone that
 * has never seen the app, which is why this cannot be a relative path. Two
 * things make that harder than joining strings:
 *
 * - The app is not always at the domain root. On GitHub Pages it lives under
 *   `/qjume2/`, and `window.location.origin` drops that — the codes printed
 *   for counters pointed at a 404.
 * - A portable build routes on the fragment, so the path has to sit after a
 *   `#` or the server is asked for a file that was never deployed.
 */
export function appUrl(path: string): string {
  const clean = path.replace(/^\//, '');
  // BASE_URL is Vite's, and always ends in a slash.
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  // The router is a hash router exactly when the build is portable, and the
  // same flag decides both, so they cannot disagree.
  return import.meta.env.VITE_PORTABLE === 'true'
    ? `${base}#/${clean}`
    : `${base}${clean}`;
}

/**
 * The URL a counter QR code carries.
 *
 * `join=1` opens the join form rather than the queue's detail page — someone
 * holding a phone up to a code has already decided. `at=counter` says the scan
 * happened in the shop, which is what lets a queue in `drainMode` still take
 * them: it has stopped accepting remote joiners, not the person at the till.
 * Both codes — the printed one and the monitor's — are the same URL, so there
 * is one string to get right.
 */
export function counterJoinUrl(shopId: string, queueId: string): string {
  return appUrl(`q/${shopId}/${queueId}?join=1&at=counter`);
}
