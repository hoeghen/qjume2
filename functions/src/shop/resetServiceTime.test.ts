import { beforeEach, describe, expect, it } from 'vitest';
import { performResetServiceTime } from './resetServiceTime.js';
import {
  OWNER_UID,
  clearFirestore,
  getQueue,
  seedQueue,
  testDb,
} from '../test/harness.js';

beforeEach(clearFirestore);

describe('resetServiceTime', () => {
  it('forgets the learned time, so the owner’s figure applies again', async () => {
    const fx = await seedQueue(
      {},
      {
        avgServiceTimeSeconds: 300,
        observedServiceTimeSeconds: 156,
        servedSampleCount: 62,
      },
    );

    await performResetServiceTime(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
    });

    const queue = await getQueue(fx);
    expect(queue.observedServiceTimeSeconds).toBeNull();
    expect(queue.servedSampleCount).toBe(0);
    expect(queue.avgServiceTimeSeconds).toBe(300);
  });

  it('rejects someone who cannot serve at the shop', async () => {
    const fx = await seedQueue({}, { observedServiceTimeSeconds: 156 });

    await expect(
      performResetServiceTime(testDb, 'someone-else', {
        shopId: fx.shopId,
        queueId: fx.queueId,
      }),
    ).rejects.toThrow();
    expect((await getQueue(fx)).observedServiceTimeSeconds).toBe(156);
  });

  it('refuses a queue that does not exist', async () => {
    const fx = await seedQueue();

    await expect(
      performResetServiceTime(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: 'missing',
      }),
    ).rejects.toThrow();
  });
});
