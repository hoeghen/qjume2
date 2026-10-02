import { describe, expect, it } from 'vitest';
import {
  estimatedWaitSeconds,
  joinWaitSeconds,
  staffedTills,
} from '../../src/lib/queue/waitTime.js';
import {
  applyFilters,
  type DiscoveredQueue,
  type Filters,
} from '../../src/lib/discovery.js';
import { formatDistance, formatWait } from '../../src/lib/format.js';
import { createT } from '../../src/lib/i18n/LanguageContext.js';

const t = createT('en');

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
  // No distance limit unless a test sets one — matching the screen's default.
  radiusKm: null,
  category: 'all',
  status: 'all',
  search: '',
  sort: 'distance',
};

describe('the distance filter', () => {
  const near = queue({ id: 'near', distanceKm: 0.4 });
  const mid = queue({ id: 'mid', distanceKm: 4 });
  const far = queue({ id: 'far', distanceKm: 9 });

  it('keeps everything when no limit is set', () => {
    const result = applyFilters([near, mid, far], { ...base, radiusKm: null });
    expect(result.map((q) => q.id)).toEqual(['near', 'mid', 'far']);
  });

  it('drops what is beyond the limit', () => {
    const result = applyFilters([near, mid, far], { ...base, radiusKm: 5 });
    expect(result.map((q) => q.id)).toEqual(['near', 'mid']);
  });

  it('keeps a queue sitting exactly on the limit', () => {
    const result = applyFilters([near, mid, far], { ...base, radiusKm: 4 });
    expect(result.map((q) => q.id)).toEqual(['near', 'mid']);
  });

  it('can exclude everything', () => {
    expect(applyFilters([near, mid, far], { ...base, radiusKm: 0.1 })).toEqual([]);
  });
});

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
  const seeded = { avgServiceTimeSeconds: 900, observedServiceTimeSeconds: null };

  it('counts everyone ahead at the owner\'s figure until one is learned', () => {
    // Three ahead of a fifteen-minute service is 45 minutes, not one.
    expect(estimatedWaitSeconds(3, seeded, 1)).toBe(2700);
  });

  it('uses the learned service time once there is one', () => {
    expect(
      estimatedWaitSeconds(3, { avgServiceTimeSeconds: 900, observedServiceTimeSeconds: 600 }, 1),
    ).toBe(1800);
  });

  it('divides across tills serving at once', () => {
    expect(estimatedWaitSeconds(4, seeded, 2)).toBe(1800);
  });

  it('never divides by zero tills', () => {
    expect(estimatedWaitSeconds(2, seeded, 0)).toBe(1800);
  });

  it('counts only tills that are serving', () => {
    // A till opened once and left idle still exists; it serves nobody.
    expect(staffedTills([{ serving: true }, { serving: false }, { serving: false }])).toBe(1);
    expect(staffedTills([{ serving: true }, { serving: true }])).toBe(2);
    expect(staffedTills([])).toBe(1);
    expect(staffedTills(null)).toBe(1);
  });

  it('reads the staffed count off the queue for lists', () => {
    expect(joinWaitSeconds({ ...seeded, waitingCount: 4, servingStations: 2 })).toBe(1800);
    // Queues from before the count existed read as one till.
    expect(joinWaitSeconds({ ...seeded, waitingCount: 4 })).toBe(3600);
    // Nobody serving yet is still one till's worth of wait, not none.
    expect(joinWaitSeconds({ ...seeded, waitingCount: 4, servingStations: 0 })).toBe(3600);
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
    expect(formatWait(seconds, t)).toBe(expected);
  });

  it.each([
    [0.35, '350 m'],
    [1.24, '1.2 km'],
    [12.6, '13 km'],
  ])('formats %f km as %s', (km, expected) => {
    expect(formatDistance(km)).toBe(expected);
  });
});
