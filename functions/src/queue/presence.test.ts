import { describe, expect, it } from 'vitest';
import { nextStatusForServing } from '../../../src/lib/queue/presence.js';

describe('serving changes', () => {
  it('takes an open queue offline when the last station stops serving', () => {
    expect(nextStatusForServing('open', false)).toBe('unavailable');
  });

  it('brings it back when a station starts serving again', () => {
    expect(nextStatusForServing('unavailable', true)).toBe('open');
  });

  it.each(['paused', 'drainMode', 'closed'] as const)(
    'leaves a %s queue alone when the last station stops',
    (status) => {
      // The owner chose that state; nobody serving must not undo it.
      expect(nextStatusForServing(status, false)).toBeNull();
    },
  );

  it.each(['paused', 'drainMode', 'closed'] as const)(
    'does not reopen a %s queue when a station starts serving',
    (status) => {
      // The case that matters: a shop closes while a station is mid-shift,
      // and staff starting to serve again must not quietly reopen it.
      expect(nextStatusForServing(status, true)).toBeNull();
    },
  );

  it('does nothing when the status already matches', () => {
    expect(nextStatusForServing('open', true)).toBeNull();
    expect(nextStatusForServing('unavailable', false)).toBeNull();
  });
});
