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
async function query(apiKey: string, address: string, limit: number): Promise<OpenCageResponse> {
  const url = new URL('https://api.opencagedata.com/geocode/v1/json');
  url.searchParams.set('q', address);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('no_annotations', '1');

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`);
  }
  return (await response.json()) as OpenCageResponse;
}

// A dropdown of candidates is only useful while it's short enough to scan.
// OpenCage's forward-geocode endpoint (the same one `geocode` uses) already
// returns its best matches for an ambiguous query when asked for more than
// one - there is no separate autocomplete product to call.
const SUGGESTION_LIMIT = 5;

export function openCageProvider(apiKey: string): GeocodingProvider {
  return {
    name: 'opencage',
    async geocode(address: string): Promise<GeocodeResult | null> {
      const body = await query(apiKey, address, 1);
      const first = body.results?.[0];
      const lat = first?.geometry?.lat;
      const lng = first?.geometry?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;

      return { lat, lng, formatted: first?.formatted ?? address };
    },
    async suggest(partial: string): Promise<GeocodeResult[]> {
      const body = await query(apiKey, partial, SUGGESTION_LIMIT);
      const results: GeocodeResult[] = [];
      for (const result of body.results ?? []) {
        const lat = result.geometry?.lat;
        const lng = result.geometry?.lng;
        if (typeof lat !== 'number' || typeof lng !== 'number') continue;
        results.push({ lat, lng, formatted: result.formatted ?? partial });
      }
      return results;
    },
  };
}
