import { geohashForLocation } from 'geofire-common';
import type { GeocodingProvider, GeocodeResult } from './provider.js';
import { stubProvider } from './stub.js';
import { openCageProvider } from './openCage.js';

export type { GeocodingProvider, GeocodeResult } from './provider.js';
export { stubProvider } from './stub.js';

/** Coordinates plus the geohash the radius queries index on. See PRD 9.3. */
export interface GeocodedAddress extends GeocodeResult {
  geohash: string;
}

/**
 * Selects a provider from configuration.
 *
 * The stub must be asked for by name — a missing key falls back to it only in
 * the emulator, never in a deployed function, where silently storing invented
 * coordinates would put queues on the map in the wrong place.
 */
export function providerFromEnv(env = process.env): GeocodingProvider {
  const name = env['GEOCODING_PROVIDER'];
  const key = env['GEOCODING_API_KEY'];

  if (name === 'stub') return stubProvider;
  if (name === 'opencage') {
    if (!key) throw new Error('GEOCODING_API_KEY is required for opencage.');
    return openCageProvider(key);
  }
  if (name) throw new Error(`Unknown GEOCODING_PROVIDER: ${name}`);

  if (env['FIRESTORE_EMULATOR_HOST']) return stubProvider;
  throw new Error(
    'GEOCODING_PROVIDER is not configured. Set it to "opencage" with a ' +
      'GEOCODING_API_KEY, or to "stub" for local development.',
  );
}

/** Geocode an address and derive its geohash, or null if it cannot be found. */
export async function geocodeAddress(
  address: string,
  provider: GeocodingProvider = providerFromEnv(),
): Promise<GeocodedAddress | null> {
  const result = await provider.geocode(address);
  if (!result) return null;
  return {
    ...result,
    geohash: geohashForLocation([result.lat, result.lng]),
  };
}
