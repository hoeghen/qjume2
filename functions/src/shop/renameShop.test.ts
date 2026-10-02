import { beforeEach, describe, expect, it } from 'vitest';
import { performRenameShop } from './renameShop.js';
import { performAdminUpdateShop } from '../admin/updateShop.js';
import { OWNER_UID, clearFirestore, seedQueue, testDb, type Fixture } from '../test/harness.js';
import type { Queue, Shop } from '../../../src/types/index.js';

beforeEach(clearFirestore);

const shopName = async (fx: Fixture) =>
  ((await testDb.doc(`shops/${fx.shopId}`).get()).data() as Shop).name;
const queueShopNames = async (fx: Fixture) =>
  (await testDb.collection(`shops/${fx.shopId}/queues`).get()).docs.map(
    (d) => (d.data() as Queue).shopName,
  );

async function twoQueues(): Promise<Fixture> {
  const fx = await seedQueue();
  await testDb
    .collection(`shops/${fx.shopId}/queues`)
    .doc('second')
    .set((await testDb.doc(`shops/${fx.shopId}/queues/${fx.queueId}`).get()).data()!);
  return fx;
}

describe('renaming a shop', () => {
  it('changes the shop and every queue’s copy of the name together', async () => {
    // Discovery reads the name off the queues; a rename that missed them
    // would leave every listing showing the old one.
    const fx = await twoQueues();

    await expect(
      performRenameShop(testDb, OWNER_UID, { shopId: fx.shopId, name: '  Riverside Apotek ' }),
    ).resolves.toEqual({ name: 'Riverside Apotek' });

    expect(await shopName(fx)).toBe('Riverside Apotek');
    expect(await queueShopNames(fx)).toEqual(['Riverside Apotek', 'Riverside Apotek']);
  });

  it('is the owner’s alone', async () => {
    const fx = await seedQueue();
    await expect(
      performRenameShop(testDb, 'someone-else', { shopId: fx.shopId, name: 'Mine now' }),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(await shopName(fx)).toBe('Test Shop');
  });

  it('refuses an empty or overlong name', async () => {
    const fx = await seedQueue();
    for (const name of ['   ', 'x'.repeat(81)]) {
      await expect(
        performRenameShop(testDb, OWNER_UID, { shopId: fx.shopId, name }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    }
  });

  it('keeps the queues in step when a platform admin renames it too', async () => {
    const fx = await twoQueues();
    await performAdminUpdateShop(
      testDb,
      { uid: 'admin-uid', email: 'admin@example.com' },
      { shopId: fx.shopId, name: 'Renamed by admin', exclusiveQueues: false },
    );
    expect(await queueShopNames(fx)).toEqual(['Renamed by admin', 'Renamed by admin']);
  });
});
