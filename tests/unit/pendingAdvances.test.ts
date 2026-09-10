import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAdvances,
  pendingCount,
  pendingFor,
  recordAdvance,
  replayAdvances,
  type PendingAdvance,
} from '../../src/lib/offline/pendingAdvances.js';

// A minimal localStorage, since these run outside a browser.
const store = new Map<string, string>();
vi.stubGlobal('window', {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
});

const advance = (over: Partial<PendingAdvance> = {}): PendingAdvance => ({
  shopId: 's1',
  queueId: 'q1',
  stationId: 'till1',
  outcome: 'served',
  at: 1000,
  ...over,
});

beforeEach(() => {
  store.clear();
  clearAdvances();
});

describe('recording advances made offline', () => {
  it('keeps them until they are replayed', () => {
    recordAdvance(advance());
    recordAdvance(advance({ at: 2000 }));
    expect(pendingCount()).toBe(2);
  });

  it('separates one queue from another', () => {
    recordAdvance(advance({ queueId: 'q1' }));
    recordAdvance(advance({ queueId: 'q2' }));
    expect(pendingFor('s1', 'q1')).toHaveLength(1);
  });
});

describe('replaying on reconnect', () => {
  it('replays oldest first, since these are queue advances', () => {
    const seen: number[] = [];
    recordAdvance(advance({ at: 3000 }));
    recordAdvance(advance({ at: 1000 }));
    recordAdvance(advance({ at: 2000 }));

    return replayAdvances(async (a) => {
      seen.push(a.at);
    }).then((result) => {
      expect(seen).toEqual([1000, 2000, 3000]);
      expect(result.replayed).toBe(3);
      expect(pendingCount()).toBe(0);
    });
  });

  it('carries the recorded outcome, not a default', async () => {
    const outcomes: string[] = [];
    recordAdvance(advance({ at: 1000, outcome: 'noShow' }));
    recordAdvance(advance({ at: 2000, outcome: 'served' }));

    await replayAdvances(async (a) => {
      outcomes.push(a.outcome);
    });
    expect(outcomes).toEqual(['noShow', 'served']);
  });

  it('stops at the first failure rather than skipping it', async () => {
    // Skipping one and continuing would serve people in the wrong order.
    recordAdvance(advance({ at: 1000 }));
    recordAdvance(advance({ at: 2000 }));
    recordAdvance(advance({ at: 3000 }));

    const result = await replayAdvances(async (a) => {
      if (a.at === 2000) throw new Error('offline again');
    });

    expect(result.replayed).toBe(1);
    expect(result.remaining).toBe(2);
    // The failed one is still first in line for the next attempt.
    expect(pendingFor('s1', 'q1')[0]?.at).toBe(2000);
  });

  it('is a no-op when nothing is queued', async () => {
    const send = vi.fn();
    const result = await replayAdvances(send);
    expect(send).not.toHaveBeenCalled();
    expect(result).toEqual({ replayed: 0, remaining: 0 });
  });
});
