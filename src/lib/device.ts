/**
 * An id for this browser on this device, so a till can be held by a device
 * rather than by a person — one owner signed in on a PC and a phone is one
 * account but two places to stand (`Station.activeDeviceId`).
 *
 * Random and local: it identifies nothing beyond "the same browser as last
 * time", and is never used for anything but till holds. Where storage is
 * blocked it lasts for the visit, which only means a hold is let go of a
 * little sooner than it otherwise would.
 */
const KEY = 'qjume:device';
let fallback: string | null = null;

function fresh(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function deviceId(): string {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored) return stored;
    const id = fresh();
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    fallback ??= fresh();
    return fallback;
  }
}
