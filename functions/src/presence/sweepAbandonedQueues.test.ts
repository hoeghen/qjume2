import { beforeEach, describe, expect, it } from 'vitest';
import { performSweepAbandonedQueues } from './sweepAbandonedQueues.js';
import {
  clearFirestore,
  getQueue,
  getStation,
  seedQueue,
  seedStation,
  testDb,
} from '../test/harness.js';

beforeEach(clearFirestore);

const HOUR = 60 * 60 * 1000;
const now = Date.now();

describe('sweepAbandonedQueues', () => {
  it('takes an open queue offline once it has been quiet past the threshold', async () => {
    const fx = await seedQueue({}, { status: 'open', lastServedAt: now - 5 * HOUR });
    const stationId = await seedStation(fx, 'Till 1', { serving: true });

    await performSweepAbandonedQueues(testDb, now);

    expect((await getQueue(fx)).status).toBe('unavailable');
    // Cleared so a returning device shows "Start serving", not a stale toggle.
    expect((await getStation(fx, stationId)).serving).toBe(false);
  });

  it('leaves a recently active queue alone', async () => {
    const fx = await seedQueue({}, { status: 'open', lastServedAt: now - 1 * HOUR });
    await seedStation(fx, 'Till 1', { serving: true });

    await performSweepAbandonedQueues(testDb, now);

    expect((await getQueue(fx)).status).toBe('open');
  });

  it('sweeps a queue opened directly that was never actually served', async () => {
    // lastServedAt stays null until a station calls startServing or callNext —
    // a queue opened by the plain "Open queue" toggle has neither yet.
    const fx = await seedQueue({}, { status: 'open', lastServedAt: null });

    await performSweepAbandonedQueues(testDb, now);

    expect((await getQueue(fx)).status).toBe('unavailable');
  });

  it.each(['paused', 'drainMode', 'closed', 'unavailable'] as const)(
    'never touches a %s queue',
    async (status) => {
      const fx = await seedQueue({}, { status, lastServedAt: now - 5 * HOUR });

      await performSweepAbandonedQueues(testDb, now);

      expect((await getQueue(fx)).status).toBe(status);
    },
  );
});
