import { describe, expect, it } from 'vitest';
import {
  estimatedWaitSeconds,
  joinWaitSeconds,
  staffedTills,
} from '../../src/lib/queue/waitTime.js';

const fiveMinutes = { avgServiceTimeSeconds: 300, observedServiceTimeSeconds: null };

describe('wait estimate', () => {
  it('is people ahead × service time with one till', () => {
    // Three walk-ins ahead of a 5-minute service: 15 minutes.
    expect(estimatedWaitSeconds(3, fiveMinutes, 1)).toBe(900);
  });

  it('grows by one service time per walk-in added', () => {
    const before = estimatedWaitSeconds(3, fiveMinutes, 1);
    const after = estimatedWaitSeconds(4, fiveMinutes, 1);
    expect(after - before).toBe(300);
  });

  it('uses the learned service time once there is one', () => {
    // A queue that has learned 156 s per customer quotes 3 × 156, not 3 × 300.
    const learned = { avgServiceTimeSeconds: 300, observedServiceTimeSeconds: 156 };
    expect(estimatedWaitSeconds(3, learned, 1)).toBe(468);
  });

  it('divides by the tills serving now, never fewer than one', () => {
    expect(estimatedWaitSeconds(3, fiveMinutes, 3)).toBe(300);
    expect(staffedTills([])).toBe(1);
    expect(staffedTills([{ serving: true }, { serving: false }])).toBe(1);
    expect(staffedTills([{ serving: true }, { serving: true }])).toBe(2);
  });

  it('gives a joiner the same figure from the queue doc alone', () => {
    expect(
      joinWaitSeconds({ ...fiveMinutes, waitingCount: 3, servingStations: 1 }),
    ).toBe(900);
  });
});
