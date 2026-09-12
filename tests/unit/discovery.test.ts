import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  estimatedWaitSeconds,
  type DiscoveredQueue,
  type Filters,
} from '../../src/lib/discovery.js';
import { formatDistance, formatWait } from '../../src/lib/format.js';

function queue(over: Partial<DiscoveredQueue> = {}): DiscoveredQueue {
  return {
    id: 'q1',
    shopId: 's1',
    distanceKm: 1,
    name: 'Prescriptions',
    shopName: 'Test Pharmacy',
    description: null,
    category: 'health-and-medical',
    maxSize: 20,
    address: '1 Test Street',
    lat: 51.5,
    lng: -0.12,
    geohash: 'gcpvj0duqp',
    avgServiceTimeSeconds: 300,
    noShowPenalty: 'back',
    status: 'open',
    schedule: null,
    currentNumber: 0,
    lastIssuedNumber: 0,
    lastPosition: 0,
    lastServedAt: null,
    waitingCount: 2,
    ...over,
  };
}

const base: Filters = {
  radiusKm: 5,
  category: 'all',
  status: 'all',
  search: '',
  sort: 'distance',
};

describe('filtering', () => {
  it('sorts by distance, nearest first', () => {
    const result = applyFilters(
      [queue({ id: 'far', distanceKm: 9 }), queue({ id: 'near', distanceKm: 0.4 })],
      base,
    );
    expect(result.map((q) => q.id)).toEqual(['near', 'far']);
  });

  it('sorts by shortest wait', () => {
    const result = applyFilters(
      [
        queue({ id: 'busy', waitingCount: 10 }),
        queue({ id: 'quiet', waitingCount: 1 }),
      ],
      { ...base, sort: 'wait' },
    );
    expect(result.map((q) => q.id)).toEqual(['quiet', 'busy']);
  });

  it('sorts by shop name', () => {
    const result = applyFilters(
      [queue({ id: 'z', shopName: 'Zed' }), queue({ id: 'a', shopName: 'Alpha' })],
      { ...base, sort: 'name' },
    );
    expect(result.map((q) => q.id)).toEqual(['a', 'z']);
  });

  it('filters by category', () => {
    const result = applyFilters(
      [queue({ id: 'health' }), queue({ id: 'food', category: 'food-and-drink' })],
      { ...base, category: 'food-and-drink' },
    );
    expect(result.map((q) => q.id)).toEqual(['food']);
  });

  it('counts a draining queue as open for business', () => {
    // It is still serving; it just is not taking anyone new.
    const result = applyFilters(
      [queue({ id: 'draining', status: 'drainMode' }), queue({ id: 'shut', status: 'closed' })],
      { ...base, status: 'active' },
    );
    expect(result.map((q) => q.id)).toEqual(['draining']);
  });

  it.each([
    ['shop name', 'pharmacy'],
    ['address', 'test street'],
    ['queue name', 'prescriptions'],
    ['description', 'flu jab'],
  ])('searches %s', (_label, needle) => {
    const result = applyFilters(
      [queue({ description: 'Walk-in flu jab clinic' }), queue({ id: 'other', shopName: 'Bakery', name: 'Counter', address: '9 Elsewhere', description: null })],
      { ...base, search: needle },
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('q1');
  });

  it('ignores case and surrounding space when searching', () => {
    const result = applyFilters([queue()], { ...base, search: '  PHARMACY ' });
    expect(result).toHaveLength(1);
  });
});

describe('wait estimate', () => {
  it('counts everyone ahead at the queue average', () => {
    expect(estimatedWaitSeconds({ waitingCount: 4, avgServiceTimeSeconds: 300 })).toBe(1200);
  });

  it('divides across parallel stations', () => {
    // Two tills serving at once halves the wait.
    expect(
      estimatedWaitSeconds({ waitingCount: 4, avgServiceTimeSeconds: 300 }, 2),
    ).toBe(600);
  });

  it('never divides by zero stations', () => {
    expect(
      estimatedWaitSeconds({ waitingCount: 2, avgServiceTimeSeconds: 60 }, 0),
    ).toBe(120);
  });
});

describe('formatting', () => {
  it.each([
    [0, 'No wait'],
    [30, 'Less than a minute'],
    [1500, 'About 25 min'],
    [3600, 'About 1 hr'],
    [4200, 'About 1 hr 10 min'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatWait(seconds)).toBe(expected);
  });

  it.each([
    [0.35, '350 m'],
    [1.24, '1.2 km'],
    [12.6, '13 km'],
  ])('formats %f km as %s', (km, expected) => {
    expect(formatDistance(km)).toBe(expected);
  });
});
