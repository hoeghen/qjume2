import type { GeocodingProvider, GeocodeResult } from './provider.js';

interface OpenCageResponse {
  results?: {
    geometry?: { lat?: number; lng?: number };
    formatted?: string;
  }[];
}

/**
 * OpenCage. Chosen as the default production provider because its terms permit
 * storing results indefinitely and place no restriction on what map — if any —
 * the results are displayed on. Both matter here: coordinates live on the queue
 * document for the life of the queue.
 */
export function openCageProvider(apiKey: string): GeocodingProvider {
  return {
    name: 'opencage',
    async geocode(address: string): Promise<GeocodeResult | null> {
      const url = new URL('https://api.opencagedata.com/geocode/v1/json');
      url.searchParams.set('q', address);
      url.searchParams.set('key', apiKey);
      url.searchParams.set('limit', '1');
      url.searchParams.set('no_annotations', '1');

      const response = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const body = (await response.json()) as OpenCageResponse;
      const first = body.results?.[0];
      const lat = first?.geometry?.lat;
      const lng = first?.geometry?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;

      return { lat, lng, formatted: first?.formatted ?? address };
    },
  };
}
