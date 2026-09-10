import { describe, expect, it } from 'vitest';
import { decideMilestone, waitMinutesFor } from './milestones.js';

describe('milestone selection', () => {
  it('says nothing while the turn is still far off', () => {
    expect(decideMilestone(40, [])).toEqual({ send: null, dispatched: [] });
  });

  it('announces the first milestone as it is reached', () => {
    expect(decideMilestone(14, [])).toEqual({ send: 15, dispatched: [15] });
  });

  it('never repeats a milestone already sent', () => {
    expect(decideMilestone(14, [15])).toEqual({ send: null, dispatched: [] });
  });

  it('sends only the most urgent when a queue jumps forward', () => {
    // Five people leave at once: a twenty-minute wait becomes four, crossing
    // 15, 10 and 5 together. One alert, not three.
    expect(decideMilestone(4, [])).toEqual({ send: 5, dispatched: [15, 10, 5] });
  });

  it('does not fire a leapfrogged milestone late', () => {
    const jumped = decideMilestone(4, []);
    // Having marked 15 and 10 dispatched, a later advance must stay quiet
    // about them even though the wait is still under both.
    expect(decideMilestone(4, jumped.dispatched)).toEqual({
      send: null,
      dispatched: [],
    });
  });

  it('still announces the last minute after an earlier jump', () => {
    const jumped = decideMilestone(4, []);
    expect(decideMilestone(1, jumped.dispatched)).toEqual({
      send: 1,
      dispatched: [1],
    });
  });

  it('treats being next as the final call', () => {
    expect(decideMilestone(0, [15, 10, 5])).toEqual({ send: 1, dispatched: [1] });
  });

  it('says nothing once every milestone has been sent', () => {
    expect(decideMilestone(0, [15, 10, 5, 1])).toEqual({
      send: null,
      dispatched: [],
    });
  });
});

describe('wait estimate', () => {
  it('counts the people ahead at the queue average', () => {
    expect(waitMinutesFor(4, 300, 1)).toBe(20);
  });

  it('divides across parallel stations', () => {
    expect(waitMinutesFor(4, 300, 2)).toBe(10);
  });

  it('is zero for whoever is next', () => {
    expect(waitMinutesFor(0, 300, 1)).toBe(0);
  });

  it('never divides by zero stations', () => {
    expect(waitMinutesFor(2, 60, 0)).toBe(2);
  });
});
