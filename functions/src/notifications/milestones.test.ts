import { describe, expect, it } from 'vitest';
import { decidePositionMilestone, waitMinutesFor } from './milestones.js';

describe('decidePositionMilestone', () => {
  it('sends nothing while more than three people are ahead', () => {
    expect(decidePositionMilestone(4, [])).toEqual({ send: null, dispatched: [] });
  });

  it('fires at three, two, one and zero ahead, once each', () => {
    let done: (3 | 2 | 1 | 0)[] = [];
    for (const ahead of [3, 2, 1, 0] as const) {
      const decision = decidePositionMilestone(ahead, done);
      expect(decision.send).toBe(ahead);
      done = [...done, ...decision.dispatched];
      expect(decidePositionMilestone(ahead, done).send).toBeNull();
    }
  });

  it('sends only the most urgent when a jump crosses several, and never the skipped ones later', () => {
    const jumped = decidePositionMilestone(1, []);
    expect(jumped).toEqual({ send: 1, dispatched: [3, 2, 1] });
    expect(decidePositionMilestone(1, jumped.dispatched).send).toBeNull();
    expect(decidePositionMilestone(0, jumped.dispatched)).toEqual({
      send: 0,
      dispatched: [0],
    });
  });

  it('says "you are next" to someone who reaches the front from far back in one advance', () => {
    expect(decidePositionMilestone(0, [])).toEqual({
      send: 0,
      dispatched: [3, 2, 1, 0],
    });
  });
});

describe('waitMinutesFor', () => {
  it('matches what the ticket screen shows', () => {
    const seeded = { avgServiceTimeSeconds: 300, observedServiceTimeSeconds: null };
    expect(waitMinutesFor(3, seeded, 1)).toBe(15);
    expect(waitMinutesFor(3, seeded, 3)).toBe(5);
    expect(waitMinutesFor(0, seeded, 1)).toBe(0);
    // The learned time replaces the owner's figure once there is one.
    const learned = { avgServiceTimeSeconds: 900, observedServiceTimeSeconds: 600 };
    expect(waitMinutesFor(3, learned, 1)).toBe(30);
  });
});
