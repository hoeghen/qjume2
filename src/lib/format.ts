/** "about 25 min", "about 1 hr 10 min", "no wait". */
export function formatWait(seconds: number): string {
  if (seconds <= 0) return 'No wait';
  // Checked before rounding: 30s rounds up to 1 minute, which would read as a
  // wait when there is barely one.
  if (seconds < 60) return 'Less than a minute';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `About ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? `About ${hours} hr`
    : `About ${hours} hr ${rest} min`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}
