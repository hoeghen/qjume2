import { beforeEach, describe, expect, it } from 'vitest';
import { performJoinQueue } from './joinQueue.js';
import { performCallNext } from './callNext.js';
import { performClaimTicket } from './claimTicket.js';
import { performAddWalkIn } from './addWalkIn.js';
import { performRelinkTicket } from './relinkTicket.js';
import { performLeaveQueue } from './leaveQueue.js';
import {
  OWNER_UID,
  clearFirestore,
  getQueue,
  seedQueue,
  seedStation,
  testDb,
  ticketContact,
  type Fixture,
} from '../test/harness.js';
import type { Ticket } from '../../../src/types/index.js';

const phone = (n: number) => ({ uid: `device-${n}`, isAnonymous: true });

beforeEach(clearFirestore);

async function join(fx: Fixture, n: number, name = `Customer ${n}`) {
  return performJoinQueue(testDb, phone(n), {
    shopId: fx.shopId,
    queueId: fx.queueId,
    displayName: name,
  });
}

async function readTicket(fx: Fixture, id: string): Promise<Ticket> {
  const snap = await testDb
    .doc(`shops/${fx.shopId}/queues/${fx.queueId}/tickets/${id}`)
    .get();
  return snap.data() as Ticket;
}

describe('reclaiming a ticket on another device', () => {
  it('hands the ticket to the new device', async () => {
    const fx = await seedQueue();
    const joined = await join(fx, 1, 'Marta');

    const claimed = await performClaimTicket(testDb, phone(2), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      resumeCode: joined.resumeCode,
    });

    expect(claimed.ticketId).toBe(joined.ticketId);
    expect(claimed.displayName).toBe('Marta');

    const contact = await ticketContact(fx, joined.ticketId);
    expect(contact.anonymousId).toBe('device-2');
  });

  it('accepts a code typed in lower case', async () => {
    const fx = await seedQueue();
    const joined = await join(fx, 1);
    await expect(
      performClaimTicket(testDb, phone(2), {
        shopId: fx.shopId,
        queueId: fx.queueId,
        resumeCode: joined.resumeCode.toLowerCase(),
      }),
    ).resolves.toMatchObject({ ticketId: joined.ticketId });
  });

  it('lets the old device go once the ticket has moved', async () => {
    const fx = await seedQueue();
    const joined = await join(fx, 1);
    await performClaimTicket(testDb, phone(2), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      resumeCode: joined.resumeCode,
    });

    // The first phone no longer holds it and cannot give up someone's place.
    await expect(
      performLeaveQueue(testDb, phone(1), {
        shopId: fx.shopId,
        queueId: fx.queueId,
        ticketId: joined.ticketId,
      }),
    ).rejects.toThrow(/not your ticket/i);

    await expect(
      performLeaveQueue(testDb, phone(2), {
        shopId: fx.shopId,
        queueId: fx.queueId,
        ticketId: joined.ticketId,
      }),
    ).resolves.toEqual({ ok: true });
  });

  it('rejects a wrong code without saying what was wrong', async () => {
    const fx = await seedQueue();
    await join(fx, 1);
    await expect(
      performClaimTicket(testDb, phone(2), {
        shopId: fx.shopId,
        queueId: fx.queueId,
        resumeCode: 'ZZZZZZ',
      }),
    ).rejects.toThrow(/does not match a ticket in this queue/i);
  });

  it('refuses a code belonging to a different queue', async () => {
    // Codes are scoped per queue, so the same six characters elsewhere are
    // not a key to this one.
    const a = await seedQueue();
    const b = await seedQueue();
    const joined = await performJoinQueue(testDb, phone(1), {
      shopId: a.shopId,
      queueId: a.queueId,
      displayName: 'Marta',
    });

    await expect(
      performClaimTicket(testDb, phone(2), {
        shopId: b.shopId,
        queueId: b.queueId,
        resumeCode: joined.resumeCode,
      }),
    ).rejects.toThrow(/does not match/i);
  });

  it('refuses a code that has been re-linked away', async () => {
    const fx = await seedQueue();
    const joined = await join(fx, 1);
    await performRelinkTicket(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: joined.ticketId,
    });

    await expect(
      performClaimTicket(testDb, phone(2), {
        shopId: fx.shopId,
        queueId: fx.queueId,
        resumeCode: joined.resumeCode,
      }),
    ).rejects.toThrow(/does not match/i);
  });

  it('refuses a ticket that is already finished', async () => {
    const fx = await seedQueue();
    const joined = await join(fx, 1);
    const station = await seedStation(fx, 'Till 1');
    await performCallNext(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId: station,
    });
    await performCallNext(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId: station,
    });

    await expect(
      performClaimTicket(testDb, phone(2), {
        shopId: fx.shopId,
        queueId: fx.queueId,
        resumeCode: joined.resumeCode,
      }),
    ).rejects.toThrow(/no longer active/i);
  });

  it('lets a walk-in claim their ticket on a phone after all', async () => {
    const fx = await seedQueue();
    const walkIn = await performAddWalkIn(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      displayName: 'Walk-in',
    });
    expect((await readTicket(fx, walkIn.ticketId)).holderKey).toBeNull();

    await performClaimTicket(testDb, phone(9), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      resumeCode: walkIn.resumeCode,
    });

    expect((await readTicket(fx, walkIn.ticketId)).holderKey).not.toBeNull();
  });

  it('stops the claimer joining the same queue twice', async () => {
    const fx = await seedQueue();
    const joined = await join(fx, 1);
    await performClaimTicket(testDb, phone(2), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      resumeCode: joined.resumeCode,
    });

    await expect(join(fx, 2)).rejects.toThrow(/already in this queue/i);
  });
});

describe('wait estimate learns from real service times', () => {
  it('ignores a completion too fast to be real', async () => {
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 600 });
    await join(fx, 1);
    await join(fx, 2);
    const station = await seedStation(fx, 'Till 1');

    const call = () =>
      performCallNext(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        stationId: station,
      });

    await call();
    // Called and resolved within a second or two: a mis-tap, not a service.
    await call();

    const queue = await getQueue(fx);
    // Nothing is recorded rather than a nonsense average being learnt.
    expect(queue.servedSampleCount).toBe(0);
    expect(queue.observedServiceTimeSeconds).toBeNull();
  });

  it('ignores a no-show, which resolves in seconds', async () => {
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 600 });
    await join(fx, 1);
    await join(fx, 2);
    const station = await seedStation(fx, 'Till 1');

    await performCallNext(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId: station,
    });
    await performCallNext(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId: station,
      outcome: 'noShow',
    });

    const queue = await getQueue(fx);
    // A no-show says nothing about how long serving takes.
    expect(queue.servedSampleCount).toBe(0);
    expect(queue.observedServiceTimeSeconds).toBeNull();
  });

  it('folds a realistic completion into the average', async () => {
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 600 });
    await join(fx, 1);
    await join(fx, 2);
    const station = await seedStation(fx, 'Till 1');

    await performCallNext(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId: station,
    });

    // Backdate the call so the completion looks like four minutes of work.
    const serving = await testDb
      .collection(`shops/${fx.shopId}/queues/${fx.queueId}/tickets`)
      .where('state', '==', 'serving')
      .get();
    await serving.docs[0]!.ref.update({ calledAt: Date.now() - 240_000 });

    await performCallNext(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId: station,
    });

    const queue = await getQueue(fx);
    expect(queue.servedSampleCount).toBe(1);
    // First real reading replaces the owner's guess outright.
    expect(queue.observedServiceTimeSeconds).toBeGreaterThan(200);
    expect(queue.observedServiceTimeSeconds).toBeLessThan(280);
  });
});
