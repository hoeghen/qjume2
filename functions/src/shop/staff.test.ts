import { beforeEach, describe, expect, it } from 'vitest';
import { performAddStaff, performRemoveStaff } from './staff.js';
import { OWNER_UID, clearFirestore, makeShop, testDb } from '../test/harness.js';
import type { StaffMembership } from '../../../src/types/index.js';

beforeEach(clearFirestore);

async function seedShop(plan: 'free' | 'paid' = 'paid'): Promise<string> {
  const ref = testDb.collection('shops').doc();
  await ref.set(makeShop({ plan }));
  return ref.id;
}

const lookupUid = (uid: string | null) => async () => uid;

describe('addStaff', () => {
  it('writes the per-shop record and a reverse-index membership doc', async () => {
    const shopId = await seedShop();
    const { uid } = await performAddStaff(
      testDb,
      OWNER_UID,
      { shopId, email: 'staff@example.com' },
      lookupUid('staff-uid'),
    );
    expect(uid).toBe('staff-uid');

    const member = await testDb.doc(`shops/${shopId}/staff/staff-uid`).get();
    expect(member.exists).toBe(true);

    const membershipSnap = await testDb.doc('staffMemberships/staff-uid').get();
    expect((membershipSnap.data() as StaffMembership).shopId).toBe(shopId);
  });

  it('works for a free-plan shop — the free plan is the whole app', async () => {
    const shopId = await seedShop('free');
    await expect(
      performAddStaff(
        testDb,
        OWNER_UID,
        { shopId, email: 'staff@example.com' },
        lookupUid('staff-uid'),
      ),
    ).resolves.toEqual({ uid: 'staff-uid' });
  });

  it('rejects a non-owner', async () => {
    const shopId = await seedShop();
    await expect(
      performAddStaff(
        testDb,
        'someone-else',
        { shopId, email: 'staff@example.com' },
        lookupUid('staff-uid'),
      ),
    ).rejects.toThrow(/shop owner/i);
  });

  it('rejects an email with no matching account', async () => {
    const shopId = await seedShop();
    await expect(
      performAddStaff(
        testDb,
        OWNER_UID,
        { shopId, email: 'nobody@example.com' },
        lookupUid(null),
      ),
    ).rejects.toThrow(/sign in once/i);
  });

  it('moves the reverse index when added somewhere new', async () => {
    const shop1 = await seedShop();
    const shop2 = await seedShop();
    await performAddStaff(
      testDb,
      OWNER_UID,
      { shopId: shop1, email: 'staff@example.com' },
      lookupUid('staff-uid'),
    );
    await performAddStaff(
      testDb,
      OWNER_UID,
      { shopId: shop2, email: 'staff@example.com' },
      lookupUid('staff-uid'),
    );

    const membershipSnap = await testDb.doc('staffMemberships/staff-uid').get();
    expect((membershipSnap.data() as StaffMembership).shopId).toBe(shop2);
    // The old shop's own record is untouched — removing them from shop2
    // later must not accidentally revive access at shop1.
    const oldMember = await testDb.doc(`shops/${shop1}/staff/staff-uid`).get();
    expect(oldMember.exists).toBe(true);
  });
});

describe('removeStaff', () => {
  it('removes the per-shop record and the reverse index', async () => {
    const shopId = await seedShop();
    await performAddStaff(
      testDb,
      OWNER_UID,
      { shopId, email: 'staff@example.com' },
      lookupUid('staff-uid'),
    );

    await performRemoveStaff(testDb, OWNER_UID, { shopId, uid: 'staff-uid' });

    const member = await testDb.doc(`shops/${shopId}/staff/staff-uid`).get();
    expect(member.exists).toBe(false);
    const membership = await testDb.doc('staffMemberships/staff-uid').get();
    expect(membership.exists).toBe(false);
  });

  it('leaves a newer membership at a different shop alone', async () => {
    const shop1 = await seedShop();
    const shop2 = await seedShop();
    await performAddStaff(
      testDb,
      OWNER_UID,
      { shopId: shop1, email: 'staff@example.com' },
      lookupUid('staff-uid'),
    );
    await performAddStaff(
      testDb,
      OWNER_UID,
      { shopId: shop2, email: 'staff@example.com' },
      lookupUid('staff-uid'),
    );

    // Removing them from shop1 (their old, now-stale record) must not clear
    // the reverse index, which already points at shop2.
    await performRemoveStaff(testDb, OWNER_UID, { shopId: shop1, uid: 'staff-uid' });

    const membershipSnap = await testDb.doc('staffMemberships/staff-uid').get();
    expect((membershipSnap.data() as StaffMembership).shopId).toBe(shop2);
  });

  it('rejects a non-owner', async () => {
    const shopId = await seedShop();
    await expect(
      performRemoveStaff(testDb, 'someone-else', { shopId, uid: 'staff-uid' }),
    ).rejects.toThrow(/shop owner/i);
  });
});
