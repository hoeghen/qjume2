import { createHash } from 'node:crypto';
import type { GeocodingProvider, GeocodeResult } from './provider.js';

/**
 * Deterministic fake coordinates derived from the address text.
 *
 * Used by tests and by local development, so neither depends on a network call
 * or an API key. Distinct addresses get distinct, stable coordinates, which is
 * all the distance and geohash logic needs to be exercised honestly.
 *
 * Never selected implicitly in production: `providerFromEnv` requires the
 * provider to be named explicitly.
 */
export const stubProvider: GeocodingProvider = {
  name: 'stub',
  async geocode(address: string): Promise<GeocodeResult | null> {
    const trimmed = address.trim();
    if (!trimmed) return null;

    const hash = createHash('sha256').update(trimmed.toLowerCase()).digest();
    // Spread over a small, plausible area rather than the whole globe, so
    // radius filters in development behave like they would in a real town.
    const lat = 51.5 + (hash.readUInt16BE(0) / 65535 - 0.5) * 0.4;
    const lng = -0.12 + (hash.readUInt16BE(2) / 65535 - 0.5) * 0.4;

    return {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      formatted: trimmed,
    };
  },
};
