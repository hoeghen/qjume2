/**
 * Geocoding runs at save time only — once per queue create or address edit —
 * and the resulting coordinates are stored on the queue document. That storage
 * *is* the cache: discovery uses geohash range queries against Firestore and
 * never calls a geocoder.
 *
 * Two consequences shaped this interface:
 *
 * 1. Volume is negligible, so provider cost barely matters. Quality and terms
 *    do.
 * 2. Because coordinates are stored indefinitely, the provider's terms must
 *    permit that. Some geocoders cap how long results may be retained; check
 *    before switching to one.
 *
 * The provider is therefore pluggable, and no caller depends on which one is
 * configured.
 */
export interface GeocodeResult {
  lat: number;
  lng: number;
  /** The address as the provider understood it, for the owner to sanity-check. */
  formatted: string;
}

export interface GeocodingProvider {
  readonly name: string;
  geocode(address: string): Promise<GeocodeResult | null>;
}
