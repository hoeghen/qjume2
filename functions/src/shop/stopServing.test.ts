import { beforeEach, describe, expect, it } from 'vitest';
import { performStopServing } from './stopServing.js';
import {
  OWNER_UID,
  clearFirestore,
  getQueue,
  getStation,
  seedQueue,
  seedStation,
  testDb,
} from '../test/harness.js';

beforeEach(clearFirestore);

describe('stopServing', () => {
  it('marks the station not serving', async () => {
    const fx = await seedQueue({}, { status: 'open' });
    const stationId = await seedStation(fx, 'Till 1', { serving: true });

    await performStopServing(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId,
    });

    expect((await getStation(fx, stationId)).serving).toBe(false);
  });

  it('takes the queue offline when it was the last station serving', async () => {
    const fx = await seedQueue({}, { status: 'open' });
    const stationId = await seedStation(fx, 'Till 1', { serving: true });

    await performStopServing(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId,
    });

    expect((await getQueue(fx)).status).toBe('unavailable');
  });

  it('leaves the queue open while another station is still serving', async () => {
    const fx = await seedQueue({}, { status: 'open' });
    const stationId = await seedStation(fx, 'Till 1', { serving: true });
    await seedStation(fx, 'Till 2', { serving: true });

    await performStopServing(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId,
    });

    expect((await getQueue(fx)).status).toBe('open');
  });

  it('counts the tills still serving, for the wait estimate', async () => {
    const fx = await seedQueue({}, { status: 'open' });
    const stationId = await seedStation(fx, 'Till 1', { serving: true });
    await seedStation(fx, 'Till 2', { serving: true });
    await seedStation(fx, 'Till 3', { serving: false });

    await performStopServing(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId,
    });

    expect((await getQueue(fx)).servingStations).toBe(1);
  });

  it.each(['paused', 'drainMode', 'closed'] as const)(
    'does not disturb a %s queue',
    async (status) => {
      const fx = await seedQueue({}, { status });
      const stationId = await seedStation(fx, 'Till 1', { serving: true });

      await performStopServing(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        stationId,
      });

      expect((await getQueue(fx)).status).toBe(status);
    },
  );

  it('rejects someone with no serving access', async () => {
    const fx = await seedQueue();
    const stationId = await seedStation(fx, 'Till 1', { serving: true });

    await expect(
      performStopServing(testDb, 'a-stranger', {
        shopId: fx.shopId,
        queueId: fx.queueId,
        stationId,
      }),
    ).rejects.toThrow(/not serving this shop/i);
  });
});
