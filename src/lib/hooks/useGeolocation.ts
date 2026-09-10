import { useCallback, useEffect, useState } from 'react';
import type { Coordinates } from '../discovery.js';

export type LocationStatus =
  | 'idle'
  | 'locating'
  | 'granted'
  | 'denied'
  | 'unavailable';

export interface LocationState {
  coords: Coordinates | null;
  status: LocationStatus;
  request: () => void;
}

const STORAGE_KEY = 'qjume:last-location';

function remember(coords: Coordinates) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
  } catch {
    // Nothing depends on this persisting.
  }
}

function recall(): Coordinates | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Coordinates).lat === 'number' &&
      typeof (parsed as Coordinates).lng === 'number'
    ) {
      return parsed as Coordinates;
    }
  } catch {
    // Corrupt or unreadable; ask the browser instead.
  }
  return null;
}

/**
 * The customer's location, if they will share it.
 *
 * Distance sorting needs it, but nothing else does: a denied prompt leaves
 * discovery working, just sorted by name instead. The last known position is
 * remembered so a returning visitor sees distances immediately rather than
 * staring at a spinner while the browser re-locates.
 */
export function useGeolocation(): LocationState {
  const [coords, setCoords] = useState<Coordinates | null>(recall);
  const [status, setStatus] = useState<LocationStatus>('idle');

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCoords(next);
        remember(next);
        setStatus('granted');
      },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  useEffect(() => {
    // Ask once on mount. The browser only shows a prompt if it has to, and a
    // refusal is remembered by the browser, not re-prompted every visit.
    request();
  }, [request]);

  return { coords, status, request };
}
