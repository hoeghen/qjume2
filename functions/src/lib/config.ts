/**
 * Where a notification's link should point.
 *
 * Configured rather than derived: a Cloud Function has no idea what hostname
 * the app is served from, and a link into the wrong origin is worse than none.
 */
export function baseUrl(env = process.env): string {
  return env['APP_BASE_URL'] ?? 'http://127.0.0.1:5173';
}
