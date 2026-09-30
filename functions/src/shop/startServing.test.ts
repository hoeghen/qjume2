import { beforeEach, describe, expect, it } from 'vitest';
import { performStartServing } from './startServing.js';
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

describe('startServing', () => {
  it('marks the station serving and stamps activity', async () => {
    const fx = await seedQueue({}, { status: 'unavailable' });
    const stationId = await seedStation(fx, 'Till 1');

    await performStartServing(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId,
    });

    const station = await getStation(fx, stationId);
    expect(station.serving).toBe(true);

    const queue = await getQueue(fx);
    expect(queue.lastServedAt).not.toBeNull();
  });

  it('reopens an unavailable queue', async () => {
    const fx = await seedQueue({}, { status: 'unavailable' });
    const stationId = await seedStation(fx, 'Till 1');

    await performStartServing(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId,
    });

    expect((await getQueue(fx)).status).toBe('open');
  });

  it.each(['paused', 'drainMode', 'closed'] as const)(
    'does not reopen a %s queue',
    async (status) => {
      const fx = await seedQueue({}, { status });
      const stationId = await seedStation(fx, 'Till 1');

      await performStartServing(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        stationId,
      });

      expect((await getQueue(fx)).status).toBe(status);
    },
  );

  it('rejects someone with no serving access', async () => {
    const fx = await seedQueue();
    const stationId = await seedStation(fx, 'Till 1');

    await expect(
      performStartServing(testDb, 'a-stranger', {
        shopId: fx.shopId,
        queueId: fx.queueId,
        stationId,
      }),
    ).rejects.toThrow(/not serving this shop/i);
  });
});
