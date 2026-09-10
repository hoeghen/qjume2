import { beforeEach, describe, expect, it } from 'vitest';
import { performJoinQueue } from '../queue/joinQueue.js';
import { performCallNext } from '../queue/callNext.js';
import { performCloseQueue } from '../shop/closeQueue.js';
import { performRegisterPushToken } from '../queue/registerPushToken.js';
import { recordingChannels, type RecordedNotice } from './channels.js';
import {
  OWNER_UID,
  clearFirestore,
  seedQueue,
  seedStation,
  testDb,
  ticketContact,
  type Fixture,
} from '../test/harness.js';

const phone = (n: number) => ({ uid: `device-${n}`, isAnonymous: true });

let sent: RecordedNotice[];
let channels: ReturnType<typeof recordingChannels>;

beforeEach(async () => {
  await clearFirestore();
  sent = [];
  channels = recordingChannels(sent);
});

async function join(fx: Fixture, n: number, email?: string) {
  return performJoinQueue(testDb, phone(n), {
    shopId: fx.shopId,
    queueId: fx.queueId,
    displayName: `Customer ${n}`,
    ...(email ? { email } : {}),
  });
}

const call = (fx: Fixture, stationId: string, outcome?: 'noShow') =>
  performCallNext(
    testDb,
    OWNER_UID,
    {
      shopId: fx.shopId,
      queueId: fx.queueId,
      stationId,
      ...(outcome ? { outcome } : {}),
    },
    channels,
  );

describe('milestone alerts', () => {
  it('reaches a customer who gave an email but has no push', async () => {
    // The iOS case: never installed the PWA, so no token will ever exist.
    // Email is not a courtesy copy for them, it is the only channel.
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 300 });
    await join(fx, 1);
    await join(fx, 2, 'two@example.com');
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);

    const emails = sent.filter((n) => n.channel === 'email');
    expect(emails).toHaveLength(1);
    expect(emails[0]!.to).toBe('two@example.com');
  });

  it('sends nothing to a customer with no email and no token', async () => {
    const fx = await seedQueue();
    await join(fx, 1);
    await join(fx, 2);
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);
    expect(sent).toHaveLength(0);
  });

  it('pushes to a registered device', async () => {
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 300 });
    await join(fx, 1);
    const second = await join(fx, 2);
    await performRegisterPushToken(testDb, phone(2), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: second.ticketId,
      token: 'token-abc',
    });
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);

    const pushes = sent.filter((n) => n.channel === 'push');
    expect(pushes).toHaveLength(1);
    expect(pushes[0]!.to).toBe('token-abc');
  });

  it('uses both channels rather than falling through', async () => {
    // There is no reliable way to know a push was seen, and a duplicate is a
    // far smaller harm than a missed turn.
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 300 });
    await join(fx, 1);
    const second = await join(fx, 2, 'two@example.com');
    await performRegisterPushToken(testDb, phone(2), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: second.ticketId,
      token: 'token-abc',
    });
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);
    expect(sent.map((n) => n.channel).sort()).toEqual(['email', 'push']);
  });

  it('never sends the same milestone twice', async () => {
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 300 });
    await join(fx, 1, 'one@example.com');
    await join(fx, 2, 'two@example.com');
    await join(fx, 3, 'three@example.com');
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);
    const first = sent.length;
    // A second advance recalculates every estimate; already-sent milestones
    // must stay quiet.
    sent.length = 0;
    await call(fx, station);

    expect(first).toBeGreaterThan(0);
    const repeats = sent.filter((n) => n.to === 'two@example.com');
    expect(repeats.length).toBeLessThanOrEqual(1);
  });

  it('records which milestones were dispatched', async () => {
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 300 });
    await join(fx, 1);
    const second = await join(fx, 2, 'two@example.com');
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);

    const contact = await ticketContact(fx, second.ticketId);
    expect(contact.dispatchedMilestones.length).toBeGreaterThan(0);
  });
});

describe('notices about a place changing', () => {
  it('tells a bumped customer, and how many strikes remain', async () => {
    const fx = await seedQueue({}, { noShowPenalty: 'back' });
    const first = await join(fx, 1, 'one@example.com');
    await join(fx, 2);
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);
    sent.length = 0;
    await call(fx, station, 'noShow');

    const bumped = sent.find((n) => n.to === 'one@example.com');
    expect(bumped?.title).toMatch(/missed your turn/i);
    expect(bumped?.body).toMatch(/2 more/);
    expect(first.ticketId).toBeTruthy();
  });

  it('tells a customer removed by three no-shows', async () => {
    const fx = await seedQueue({}, { noShowPenalty: 'back' });
    const first = await join(fx, 1, 'one@example.com');
    const station = await seedStation(fx, 'Till 1');

    // Alone in the queue, so each call re-calls the same person.
    for (let strike = 0; strike < 3; strike++) {
      await call(fx, station);
      await call(fx, station, 'noShow');
    }

    const removed = sent.find((n) => /have left the queue/i.test(n.title));
    expect(removed?.body).toMatch(/missed three calls/i);
    expect(first.ticketId).toBeTruthy();
  });

  it('apologises to everyone turned away by a hard close', async () => {
    const fx = await seedQueue();
    await join(fx, 1, 'one@example.com');
    await join(fx, 2, 'two@example.com');

    await performCloseQueue(
      testDb,
      OWNER_UID,
      { shopId: fx.shopId, queueId: fx.queueId, mode: 'hard' },
      channels,
    );

    const closed = sent.filter((n) => /queue closed/i.test(n.title));
    expect(closed.map((n) => n.to).sort()).toEqual([
      'one@example.com',
      'two@example.com',
    ]);
    expect(closed[0]!.body).toMatch(/visit us next time/i);
  });

  it('says nothing when a queue drains, since nobody is turned away', async () => {
    const fx = await seedQueue();
    await join(fx, 1, 'one@example.com');

    await performCloseQueue(
      testDb,
      OWNER_UID,
      { shopId: fx.shopId, queueId: fx.queueId, mode: 'drain' },
      channels,
    );

    expect(sent.filter((n) => /queue closed/i.test(n.title))).toHaveLength(0);
  });
});

describe('push token registration', () => {
  it('refuses a token for somebody else’s ticket', async () => {
    const fx = await seedQueue();
    const first = await join(fx, 1);

    await expect(
      performRegisterPushToken(testDb, phone(2), {
        shopId: fx.shopId,
        queueId: fx.queueId,
        ticketId: first.ticketId,
        token: 'stolen',
      }),
    ).rejects.toThrow(/not your ticket/i);
  });

  it('does not duplicate a token registered twice', async () => {
    const fx = await seedQueue();
    const first = await join(fx, 1);
    const register = () =>
      performRegisterPushToken(testDb, phone(1), {
        shopId: fx.shopId,
        queueId: fx.queueId,
        ticketId: first.ticketId,
        token: 'token-abc',
      });

    await register();
    await register();

    const contact = await ticketContact(fx, first.ticketId);
    expect(contact.fcmTokens).toEqual(['token-abc']);
  });
});
