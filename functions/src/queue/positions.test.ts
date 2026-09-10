import { describe, expect, it } from 'vitest';
import {
  POSITION_GAP,
  nextPosition,
  positionAtBack,
  positionBetween,
  reindexedPositions,
} from './positions.js';

describe('positions', () => {
  it('issues increasing positions with room between them', () => {
    const a = nextPosition(0);
    const b = nextPosition(a);
    expect(b).toBeGreaterThan(a);
    expect(positionBetween(a, b)).not.toBeNull();
  });

  it('splits an interval strictly between its ends', () => {
    const mid = positionBetween(1000, 2000);
    expect(mid).toBe(1500);
    expect(mid!).toBeGreaterThan(1000);
    expect(mid!).toBeLessThan(2000);
  });

  it('reports when an interval can no longer be split', () => {
    // 1 and 1 + EPSILON are adjacent doubles: nothing is representable between
    // them, so the caller must reindex rather than emit a duplicate position.
    expect(positionBetween(1, 1 + Number.EPSILON)).toBeNull();
  });

  it('survives repeated halving without ever colliding', () => {
    let lo = 1000;
    const hi = 2000;
    const seen = new Set<number>([lo, hi]);
    for (let i = 0; i < 40; i++) {
      const mid = positionBetween(lo, hi);
      if (mid === null) break;
      expect(seen.has(mid)).toBe(false);
      seen.add(mid);
      lo = mid;
    }
  });

  it('places behind everything using the monotonic counter', () => {
    expect(positionAtBack(5000)).toBeGreaterThan(5000);
  });

  it('reindexes to evenly spaced, strictly increasing positions', () => {
    const positions = reindexedPositions(4);
    expect(positions).toEqual([
      POSITION_GAP,
      POSITION_GAP * 2,
      POSITION_GAP * 3,
      POSITION_GAP * 4,
    ]);
  });
});
