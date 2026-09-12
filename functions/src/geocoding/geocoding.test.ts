import { describe, expect, it } from 'vitest';
import { geocodeAddress, providerFromEnv, stubProvider } from './index.js';
import { openCageProvider } from './openCage.js';

describe('provider selection', () => {
  it('uses the named provider', () => {
    expect(providerFromEnv({ GEOCODING_PROVIDER: 'stub' }).name).toBe('stub');
    expect(
      providerFromEnv({
        GEOCODING_PROVIDER: 'opencage',
        GEOCODING_API_KEY: 'k',
      }).name,
    ).toBe('opencage');
  });

  it('refuses opencage without a key', () => {
    expect(() =>
      providerFromEnv({ GEOCODING_PROVIDER: 'opencage' }),
    ).toThrow(/API_KEY/);
  });

  it('rejects an unknown provider rather than guessing', () => {
    expect(() => providerFromEnv({ GEOCODING_PROVIDER: 'wat' })).toThrow(
      /Unknown/,
    );
  });

  it('falls back to the stub only under the emulator', () => {
    expect(
      providerFromEnv({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }).name,
    ).toBe('stub');
  });

  it('refuses to invent coordinates in a deployed function', () => {
    // Silently storing stub coordinates in production would put queues
    // somewhere they are not.
    expect(() => providerFromEnv({})).toThrow(/not configured/);
  });
});

describe('geocodeAddress', () => {
  it('returns coordinates and a geohash', async () => {
    const result = await geocodeAddress('1 Test Street', stubProvider);
    expect(result).not.toBeNull();
    expect(typeof result!.lat).toBe('number');
    expect(typeof result!.lng).toBe('number');
    expect(result!.geohash).toMatch(/^[0-9a-z]{10}$/);
  });

  it('is stable for the same address', async () => {
    const a = await geocodeAddress('1 Test Street', stubProvider);
    const b = await geocodeAddress('1 Test Street', stubProvider);
    expect(a).toEqual(b);
  });

  it('separates different addresses', async () => {
    const a = await geocodeAddress('1 Test Street', stubProvider);
    const b = await geocodeAddress('2 Other Road', stubProvider);
    expect(a!.geohash).not.toBe(b!.geohash);
  });

  it('returns null for an address it cannot place', async () => {
    expect(await geocodeAddress('   ', stubProvider)).toBeNull();
  });
});

describe('openCage provider', () => {
  it('reads coordinates out of a result', async () => {
    const fetchMock = async () =>
      new Response(
        JSON.stringify({
          results: [
            { geometry: { lat: 51.5, lng: -0.12 }, formatted: '1 Test St, London' },
          ],
        }),
        { status: 200 },
      );
    const original = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;
    try {
      const result = await openCageProvider('key').geocode('1 Test St');
      expect(result).toEqual({
        lat: 51.5,
        lng: -0.12,
        formatted: '1 Test St, London',
      });
    } finally {
      globalThis.fetch = original;
    }
  });

  it('returns null when nothing matches', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
      })) as typeof fetch;
    try {
      expect(await openCageProvider('key').geocode('nowhere')).toBeNull();
    } finally {
      globalThis.fetch = original;
    }
  });
});
