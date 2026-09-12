import { describe, expect, it } from 'vitest';
import {
  SERVICE_TIME_WINDOW,
  foldSample,
  isUsableSample,
} from './serviceTime.js';

describe('service time samples', () => {
  it.each([
    ['a two-second mis-tap', 2],
    ['an hour-long gap over lunch', 3600],
    ['nonsense', Number.NaN],
  ])('rejects %s', (_label, seconds) => {
    expect(isUsableSample(seconds)).toBe(false);
  });

  it('accepts a plausible service time', () => {
    expect(isUsableSample(240)).toBe(true);
  });
});

describe('rolling average', () => {
  it('moves decisively on the first sample', () => {
    // The owner's seed is a guess; one real completion should count for a lot.
    const next = foldSample({ averageSeconds: 300, sampleCount: 0 }, 60);
    expect(next.averageSeconds).toBe(60);
    expect(next.sampleCount).toBe(1);
  });

  it('converges on a steady pace', () => {
    let avg = { averageSeconds: 300, sampleCount: 0 };
    for (let i = 0; i < 20; i++) avg = foldSample(avg, 120);
    expect(avg.averageSeconds).toBe(120);
  });

  it('lets an old pace fade rather than anchoring forever', () => {
    let avg = { averageSeconds: 600, sampleCount: 0 };
    for (let i = 0; i < 30; i++) avg = foldSample(avg, 600);
    // The shop speeds up; the average should follow, not cling to the old rate.
    for (let i = 0; i < 30; i++) avg = foldSample(avg, 60);
    expect(avg.averageSeconds).toBeLessThan(100);
  });

  it('weights by 1/n until the window fills, then holds steady', () => {
    let avg = { averageSeconds: 0, sampleCount: 0 };
    for (let i = 0; i < SERVICE_TIME_WINDOW; i++) avg = foldSample(avg, 100);
    expect(avg.sampleCount).toBe(SERVICE_TIME_WINDOW);
    const after = foldSample(avg, 200);
    // One outlier moves a filled window by exactly its share.
    expect(after.averageSeconds).toBe(110);
  });
});
