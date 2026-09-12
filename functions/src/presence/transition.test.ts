import { describe, expect, it } from 'vitest';
import { nextStatusForPresence } from './transition.js';

describe('presence changes', () => {
  it('takes an open queue offline when the last device drops', () => {
    expect(nextStatusForPresence('open', false)).toBe('unavailable');
  });

  it('brings it back when a device returns', () => {
    expect(nextStatusForPresence('unavailable', true)).toBe('open');
  });

  it.each(['paused', 'drainMode', 'closed'] as const)(
    'leaves a %s queue alone when a device drops',
    (status) => {
      // The owner chose that state; a flaky network must not undo it.
      expect(nextStatusForPresence(status, false)).toBeNull();
    },
  );

  it.each(['paused', 'drainMode', 'closed'] as const)(
    'does not reopen a %s queue when a device returns',
    (status) => {
      // The case that matters: a shop closes while its tablet is offline, and
      // reconnecting must not quietly put it back into service.
      expect(nextStatusForPresence(status, true)).toBeNull();
    },
  );

  it('does nothing when presence matches the status already', () => {
    expect(nextStatusForPresence('open', true)).toBeNull();
    expect(nextStatusForPresence('unavailable', false)).toBeNull();
  });
});
