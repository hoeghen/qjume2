import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { requireCaller } from '../lib/auth.js';
import { GEOCODING_SECRETS } from '../lib/secrets.js';
import { suggestAddresses as performSuggestAddresses } from './index.js';

export interface SuggestAddressesRequest {
  query: string;
}

export interface SuggestAddressesResult {
  suggestions: { formatted: string; lat: number; lng: number }[];
}

/**
 * Address typeahead for the queue settings form.
 *
 * A thin proxy to the geocoding provider rather than a client-side call: the
 * API key is a Cloud Functions secret, never exposed to the browser (see
 * CLAUDE.md decision 10), so anything that queries it has to run here.
 * Gated on `requireCaller` alone - any signed-in session, not shop
 * ownership - since the query carries no shop context and nothing about the
 * result is sensitive; the point is only keeping this off the open internet.
 */
export const suggestAddresses = onCall<
  SuggestAddressesRequest,
  Promise<SuggestAddressesResult>
>({ secrets: GEOCODING_SECRETS }, async (request: CallableRequest<SuggestAddressesRequest>) => {
  requireCaller(request);
  const results = await performSuggestAddresses(request.data.query ?? '');
  return {
    suggestions: results.map(({ formatted, lat, lng }) => ({ formatted, lat, lng })),
  };
});
