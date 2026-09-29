import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { GEOCODING_SECRETS } from '../lib/secrets.js';
import { reverseGeocode as performReverseGeocode } from './index.js';

export interface ReverseGeocodeRequest {
  lat: number;
  lng: number;
}

export interface ReverseGeocodeResult {
  formatted: string;
}

/**
 * The address at the device's own location, for a "use my location" button
 * on the queue address field — the same proxy-only reasoning as
 * `suggestAddresses`: the geocoding API key is a Cloud Functions secret,
 * never exposed to the browser.
 */
export const reverseGeocode = onCall<
  ReverseGeocodeRequest,
  Promise<ReverseGeocodeResult>
>({ secrets: GEOCODING_SECRETS }, async (request: CallableRequest<ReverseGeocodeRequest>) => {
  requireCaller(request);
  const { lat, lng } = request.data;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw fail('invalid-argument', 'address-not-found', 'lat and lng are required.');
  }

  const result = await performReverseGeocode(lat, lng);
  if (!result) {
    throw fail(
      'not-found',
      'address-not-found',
      'Could not find an address for that location.',
    );
  }
  return { formatted: result.formatted };
});
