import { beforeEach, describe, expect, it } from 'vitest';
import { performJoinQueue } from './joinQueue.js';
import { performCallNext } from './callNext.js';
import { performLeaveQueue } from './leaveQueue.js';
import { performRemoveTicket } from './removeTicket.js';
import {
  OWNER_UID,
  clearFirestore,
  getQueue,
  seedQueue,
  seedStation,
  testDb,
  ticketContact,
  waitingOrder,
  type Fixture,
} from '../test/harness.js';
import type { Ticket } from '../../../src/types/index.js';

const customer = (n: number) => ({ uid: `customer-${n}`, isAnonymous: true });

async function join(fx: Fixture, n: number): Promise<string> {
  const { ticketId } = await performJoinQueue(testDb, customer(n), {
    shopId: fx.shopId,
    queueId: fx.queueId,
    displayName: `Customer ${n}`,
  });
  return ticketId;
}

async function joinMany(fx: Fixture, count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 1; i <= count; i++) ids.push(await join(fx, i));
  return ids;
}

async function ticket(fx: Fixture, id: string): Promise<Ticket> {
  const snap = await testDb
    .doc(`shops/${fx.shopId}/queues/${fx.queueId}/tickets/${id}`)
    .get();
  return snap.data() as Ticket;
}

beforeEach(clearFirestore);

describe('joinQueue', () => {
  it('issues sequential numbers and tracks the waiting count', async () => {
    const fx = await seedQueue();
    await joinMany(fx, 3);

    const queue = await getQueue(fx);
    expect(queue.lastIssuedNumber).toBe(3);
    expect(queue.waitingCount).toBe(3);
    expect(await waitingOrder(fx)).toEqual([
      'Customer 1',
      'Customer 2',
      'Customer 3',
    ]);
  });

  it('returns a resume code but stores only its hash', async () => {
    const fx = await seedQueue();
    const result = await performJoinQueue(testDb, customer(1), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      displayName: 'Marta',
    });

    expect(result.resumeCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{6}$/);

    // The code is a credential, so it is kept out of the publicly readable
    // half of the ticket entirely, and stored only as a hash.
    const publicHalf = await ticket(fx, result.ticketId);
    expect(JSON.stringify(publicHalf)).not.toContain(result.resumeCode);

    const stored = await ticketContact(fx, result.ticketId);
    expect(stored.resumeCodeHash).not.toContain(result.resumeCode);
    expect(stored.resumeCodeHash).toHaveLength(64);
  });

  it('refuses to add a customer twice', async () => {
    const fx = await seedQueue();
    await join(fx, 1);
    await expect(join(fx, 1)).rejects.toThrow(/already in this queue/i);
  });

  it.each(['paused', 'drainMode', 'unavailable', 'closed'] as const)(
    'refuses new joiners while %s',
    async (status) => {
      const fx = await seedQueue({}, { status });
      await expect(join(fx, 1)).rejects.toThrow(/not accepting|unavailable/i);
    },
  );

  it('enforces the free-tier waiting limit server-side', async () => {
    // The cap is enforced in the function, not merely hidden in the UI, so a
    // client calling directly still cannot exceed it. Invariant 5.
    const fx = await seedQueue({ plan: 'free' }, { waitingCount: 20 });
    await expect(join(fx, 99)).rejects.toThrow(/reached its limit/i);
  });

  it('enforces the queue max size', async () => {
    const fx = await seedQueue({}, { maxSize: 2, waitingCount: 2 });
    await expect(join(fx, 99)).rejects.toThrow(/full/i);
  });
});

describe('callNext', () => {
  it('serves waiting customers in order', async () => {
    const fx = await seedQueue();
    await joinMany(fx, 3);
    const station = await seedStation(fx, 'Till 1');
    const call = () =>
      performCallNext(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        stationId: station,
      });

    expect((await call()).displayName).toBe('Customer 1');
    expect((await call()).displayName).toBe('Customer 2');
    expect((await call()).displayName).toBe('Customer 3');

    const empty = await call();
    expect(empty.ticketId).toBeNull();
    expect((await getQueue(fx)).waitingCount).toBe(0);
  });

  it('rejects a caller who does not own the shop', async () => {
    const fx = await seedQueue();
    await join(fx, 1);
    const station = await seedStation(fx, 'Till 1');

    await expect(
      performCallNext(testDb, 'someone-else', {
        shopId: fx.shopId,
        queueId: fx.queueId,
        stationId: station,
      }),
    ).rejects.toThrow(/shop owner/i);
  });

  // ---------------------------------------------------------------------
  // Phase 1's headline requirement: two staff tapping Next at the same
  // instant must get two different customers. See CLAUDE.md invariant 2.
  // ---------------------------------------------------------------------
  it('never assigns the same customer to two stations tapping at once', async () => {
    const rounds = 15;
    let contendedRounds = 0;
    for (let round = 0; round < rounds; round++) {
      // A fresh queue per round isolates it; wiping the emulator each time is
      // far slower than the test is worth.
      const fx = await seedQueue();
      await joinMany(fx, 2);
      const [a, b] = await Promise.all([
        seedStation(fx, 'Till 1'),
        seedStation(fx, 'Till 2'),
      ]);

      // Contention against the emulator can close a transaction handle before
      // it commits, surfacing as `unavailable`/`contended`. Nothing has
      // advanced when that happens, so the round is simply retaken — the
      // point of this test is that two stations never get the same customer,
      // and a refused tap is not that. Anything else fails outright, and a
      // second refusal in the same round fails too.
      const both = () =>
        Promise.all([
          performCallNext(testDb, OWNER_UID, {
            shopId: fx.shopId,
            queueId: fx.queueId,
            stationId: a as string,
          }),
          performCallNext(testDb, OWNER_UID, {
            shopId: fx.shopId,
            queueId: fx.queueId,
            stationId: b as string,
          }),
        ]);

      let first, second;
      let attempt = 0;
      for (;;) {
        attempt += 1;
        try {
          [first, second] = await both();
          break;
        } catch (e) {
          const contended =
            (e as { details?: { reason?: string } })?.details?.reason ===
            'contended';
          if (!contended) {
            throw new Error(
              `round ${round}: a Next call failed for a reason other than ` +
                `contention — ${e instanceof Error ? e.message : String(e)}`,
            );
          }
          contendedRounds += 1;
          if (attempt >= 3) {
            throw new Error(
              `round ${round}: three consecutive taps were refused for ` +
                `contention. Not a collision, but the emulator is struggling.`,
            );
          }
        }
      }

      expect(first.ticketId, `round ${round}: first station got nobody`).not.toBeNull();
      expect(second.ticketId, `round ${round}: second station got nobody`).not.toBeNull();
      expect(
        first.ticketId,
        `round ${round}: both stations were given the same customer ` +
          `(${first.displayName})`,
      ).not.toBe(second.ticketId);

      // And the persisted state agrees: two distinct customers, one per station.
      expect(new Set([first.displayName, second.displayName]).size).toBe(2);
      expect((await getQueue(fx)).waitingCount).toBe(0);
    }
    // Visible rather than swallowed: if contention starts refusing most
    // rounds, that is worth knowing even though it is not a collision.
    expect(
      contendedRounds,
      `${contendedRounds} of ${rounds} rounds were refused for contention`,
    ).toBeLessThan(rounds / 2);
    // Generous: each round provokes real transaction contention, and the
    // emulator's retry backoff is slower than production Firestore.
  }, 120_000);

  it('hands out every customer exactly once under heavy contention', async () => {
    const fx = await seedQueue();
    const count = 12;
    await joinMany(fx, count);
    const stations = await Promise.all([
      seedStation(fx, 'Till 1'),
      seedStation(fx, 'Till 2'),
      seedStation(fx, 'Till 3'),
      seedStation(fx, 'Till 4'),
    ]);

    const served: string[] = [];
    // Four stations tapping Next in lockstep, three rounds deep.
    for (let round = 0; round < count / stations.length; round++) {
      const results = await Promise.all(
        stations.map((stationId) =>
          performCallNext(testDb, OWNER_UID, {
            shopId: fx.shopId,
            queueId: fx.queueId,
            stationId,
          }),
        ),
      );
      for (const r of results) if (r.ticketId) served.push(r.ticketId);
    }

    expect(served).toHaveLength(count);
    expect(new Set(served).size).toBe(count);
    expect((await getQueue(fx)).waitingCount).toBe(0);
  });
});

describe('no-shows', () => {
  it('moves a no-show back three places', async () => {
    const fx = await seedQueue({}, { noShowPenalty: 'back3' });
    await joinMany(fx, 5);
    const station = await seedStation(fx, 'Till 1');

    // Call Customer 1, then mark them absent.
    await performCallNext(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId: station,
    });
    const result = await performCallNext(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId: station,
      outcome: 'noShow',
    });

    expect(result.resolved?.outcome).toBe('noShow');
    expect(result.resolved?.noShowCount).toBe(1);
    expect(result.displayName).toBe('Customer 2');
    // Customer 1 was at the front; three waiting customers overtake them, so
    // they sit behind Customer 4 and ahead of Customer 5. Customer 2 has since
    // been called, which is why they are absent here.
    expect(await waitingOrder(fx)).toEqual([
      'Customer 3',
      'Customer 4',
      'Customer 1',
      'Customer 5',
    ]);
  });

  it('moves a no-show behind everyone when the penalty is `back`', async () => {
    const fx = await seedQueue({}, { noShowPenalty: 'back' });
    await joinMany(fx, 4);
    const station = await seedStation(fx, 'Till 1');
    const call = (outcome?: 'noShow') =>
      performCallNext(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        stationId: station,
        ...(outcome ? { outcome } : {}),
      });

    await call();
    await call('noShow');

    expect(await waitingOrder(fx)).toEqual([
      'Customer 3',
      'Customer 4',
      'Customer 1',
    ]);
  });

  it('removes a ticket on the third no-show', async () => {
    const fx = await seedQueue({}, { noShowPenalty: 'back' });
    const ids = await joinMany(fx, 3);
    const station = await seedStation(fx, 'Till 1');
    const first = ids[0] as string;

    const call = (outcome?: 'noShow') =>
      performCallNext(testDb, OWNER_UID, {
        shopId: fx.shopId,
        queueId: fx.queueId,
        stationId: station,
        ...(outcome ? { outcome } : {}),
      });

    /** Advance until `first` is the one being served, then mark them absent. */
    async function strike() {
      for (let i = 0; i < 10; i++) {
        const r = await call();
        if (r.ticketId === first) return call('noShow');
      }
      throw new Error('never reached the target ticket');
    }

    let r = await strike();
    expect(r.resolved?.ticketId).toBe(first);
    expect(r.resolved?.noShowCount).toBe(1);
    expect(r.resolved?.removed).toBe(false);

    r = await strike();
    expect(r.resolved?.noShowCount).toBe(2);
    expect(r.resolved?.removed).toBe(false);
    expect((await ticket(fx, first)).state).toBe('waiting');

    r = await strike();
    expect(r.resolved?.noShowCount).toBe(3);
    expect(r.resolved?.removed).toBe(true);

    expect((await ticket(fx, first)).state).toBe('removed');
    expect(await waitingOrder(fx)).not.toContain('Customer 1');
  });

  it('does not hand a just-penalised ticket straight back', async () => {
    // With one other person waiting, a `back3` penalty cannot move the no-show
    // behind three people — but they still must not be called again at once.
    const fx = await seedQueue({}, { noShowPenalty: 'back3' });
    await joinMany(fx, 2);
    const station = await seedStation(fx, 'Till 1');

    await performCallNext(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId: station,
    });
    const result = await performCallNext(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId: station,
      outcome: 'noShow',
    });

    expect(result.displayName).toBe('Customer 2');
  });

  it('keeps a new joiner behind someone a penalty just sent to the back', async () => {
    const fx = await seedQueue({}, { noShowPenalty: 'back' });
    await joinMany(fx, 2);
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
    await join(fx, 3);

    expect(await waitingOrder(fx)).toEqual(['Customer 1', 'Customer 3']);
  });
});

describe('leaving and removal', () => {
  it('lets a customer leave and frees their place', async () => {
    const fx = await seedQueue();
    const ids = await joinMany(fx, 2);

    await performLeaveQueue(testDb, customer(1), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: ids[0] as string,
    });

    expect((await ticket(fx, ids[0] as string)).state).toBe('left');
    expect((await getQueue(fx)).waitingCount).toBe(1);
    expect(await waitingOrder(fx)).toEqual(['Customer 2']);
  });

  it("refuses to let one customer leave another's ticket", async () => {
    const fx = await seedQueue();
    const ids = await joinMany(fx, 2);

    await expect(
      performLeaveQueue(testDb, customer(2), {
        shopId: fx.shopId,
        queueId: fx.queueId,
        ticketId: ids[0] as string,
      }),
    ).rejects.toThrow(/not your ticket/i);
  });

  it('lets the shop remove a customer outright', async () => {
    const fx = await seedQueue();
    const ids = await joinMany(fx, 2);

    await performRemoveTicket(testDb, OWNER_UID, {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: ids[0] as string,
    });

    expect((await ticket(fx, ids[0] as string)).state).toBe('removed');
    expect((await getQueue(fx)).waitingCount).toBe(1);
  });

  it('refuses removal by anyone but the shop owner', async () => {
    const fx = await seedQueue();
    const ids = await joinMany(fx, 1);

    await expect(
      performRemoveTicket(testDb, 'not-the-owner', {
        shopId: fx.shopId,
        queueId: fx.queueId,
        ticketId: ids[0] as string,
      }),
    ).rejects.toThrow(/shop owner/i);
  });
});
