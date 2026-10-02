import { beforeEach, describe, expect, it } from 'vitest';
import { performJoinQueue } from '../queue/joinQueue.js';
import { performCallNext } from '../queue/callNext.js';
import { performCloseQueue } from '../shop/closeQueue.js';
import { performRegisterPushToken } from '../queue/registerPushToken.js';
import { performUnregisterPushToken } from '../queue/unregisterPushToken.js';
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

// These customers join in English, so the assertions below can read the
// English wording; the language tests at the end cover Danish, the default.
async function join(fx: Fixture, n: number, email?: string, locale: string | null = 'en') {
  return performJoinQueue(testDb, phone(n), {
    shopId: fx.shopId,
    queueId: fx.queueId,
    displayName: `Customer ${n}`,
    ...(email ? { email } : {}),
    ...(locale ? { locale } : {}),
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

  it('sends no time-based alerts, only counts of people ahead', async () => {
    // Minutes drift with the average service time; a count does not. The
    // estimate rides inside the count alert instead, labelled as one.
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 300 });
    for (let n = 1; n <= 6; n++) await join(fx, n, `c${n}@example.com`);
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);

    expect(sent.some((n) => /minutes/i.test(n.title))).toBe(false);
    // Customer 6 now has four ahead: nothing yet.
    expect(sent.filter((n) => n.to === 'c6@example.com')).toEqual([]);
  });
});

describe('position alerts', () => {
  it('tells three, two, one and zero ahead, with an estimate called an estimate', async () => {
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 300 });
    for (let n = 1; n <= 5; n++) await join(fx, n, `c${n}@example.com`);
    const station = await seedStation(fx, 'Till 1');

    // Calls customer 1, leaving 2..5 waiting with 0..3 people ahead.
    await call(fx, station);

    const to = (n: number) =>
      sent.filter((x) => x.to === `c${n}@example.com`);
    expect(to(5).map((x) => x.title)).toEqual(['3 people ahead of you']);
    expect(to(5)[0]?.body).toMatch(/Estimated wait: about 15 min/);
    expect(to(4).map((x) => x.title)).toEqual(['2 people ahead of you']);
    expect(to(3).map((x) => x.title)).toEqual(['1 person ahead of you']);
    expect(to(3)[0]?.body).toMatch(/1 person is ahead/);
    expect(to(2).map((x) => x.title)).toEqual(['You’re next']);
    for (const n of [2, 3, 4, 5]) {
      expect(to(n)[0]?.body).toMatch(/only an estimate/);
    }
  });

  it('does not split the estimate across tills nobody is serving at', async () => {
    // Tills opened on earlier days stay as documents. Dividing by them turned
    // three ahead of a five-minute service into "about 5 min".
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 300 });
    for (let n = 1; n <= 5; n++) await join(fx, n, `c${n}@example.com`);
    const station = await seedStation(fx, 'Till 1', { serving: true });
    await seedStation(fx, 'Till 2', { serving: false });
    await seedStation(fx, 'Till 3', { serving: false });

    await call(fx, station);

    const toFive = sent.find((x) => x.to === 'c5@example.com');
    expect(toFive?.body).toMatch(/Estimated wait: about 15 min/);
  });

  it('never sends the same position alert twice', async () => {
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 300 });
    for (let n = 1; n <= 4; n++) await join(fx, n);
    await join(fx, 5, 'five@example.com');
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);
    expect(sent.map((n) => n.title)).toEqual(['3 people ahead of you']);

    // Customer 2 is now being served and customer 5 has two ahead: that is
    // the next alert, and "3 ahead" must not come again.
    sent.length = 0;
    await call(fx, station);
    expect(sent.map((n) => n.title)).toEqual(['2 people ahead of you']);
  });

  it('records which position alerts were dispatched', async () => {
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 300 });
    await join(fx, 1);
    await join(fx, 2);
    const third = await join(fx, 3, 'three@example.com');
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);

    const contact = await ticketContact(fx, third.ticketId);
    expect(contact.dispatchedPositions).toEqual([3, 2, 1]);
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

describe('push token unregistration', () => {
  it('removes just the one token, not the whole list', async () => {
    const fx = await seedQueue();
    const first = await join(fx, 1);
    await performRegisterPushToken(testDb, phone(1), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: first.ticketId,
      token: 'token-abc',
    });
    await performRegisterPushToken(testDb, phone(1), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: first.ticketId,
      token: 'token-def',
    });

    await performUnregisterPushToken(testDb, phone(1), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: first.ticketId,
      token: 'token-abc',
    });

    const contact = await ticketContact(fx, first.ticketId);
    expect(contact.fcmTokens).toEqual(['token-def']);
  });

  it('refuses to remove a token from somebody else’s ticket', async () => {
    const fx = await seedQueue();
    const first = await join(fx, 1);
    await performRegisterPushToken(testDb, phone(1), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: first.ticketId,
      token: 'token-abc',
    });

    await expect(
      performUnregisterPushToken(testDb, phone(2), {
        shopId: fx.shopId,
        queueId: fx.queueId,
        ticketId: first.ticketId,
        token: 'token-abc',
      }),
    ).rejects.toThrow(/not your ticket/i);
  });

  it('is a no-op when the token was never registered', async () => {
    const fx = await seedQueue();
    const first = await join(fx, 1);

    await performUnregisterPushToken(testDb, phone(1), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: first.ticketId,
      token: 'never-registered',
    });

    const contact = await ticketContact(fx, first.ticketId);
    expect(contact.fcmTokens).toEqual([]);
  });
});

describe('being called', () => {
  it('tells the called customer it is their turn, urgently, on every channel', async () => {
    // Sent even though the ticket screen already shows it: they may not be
    // looking at the phone, and this is the one alert that cannot be missed.
    const fx = await seedQueue();
    const first = await join(fx, 1, 'one@example.com');
    await performRegisterPushToken(testDb, phone(1), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: first.ticketId,
      token: 'token-one',
    });
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);

    const called = sent.filter((n) => n.title === 'It’s your turn');
    expect(called.map((n) => n.channel).sort()).toEqual(['email', 'push']);
    expect(called[0]).toMatchObject({
      urgent: true,
      body: 'Customer 1, you’re being called at Test Shop.',
    });
  });

  it('names the till only when the queue has more than one', async () => {
    const fx = await seedQueue();
    await join(fx, 1, 'one@example.com');
    await seedStation(fx, 'Till 1');
    const second = await seedStation(fx, 'Till 2');

    await call(fx, second);

    expect(sent.find((n) => n.title === 'It’s your turn')?.body).toBe(
      'Customer 1, please go to Till 2 at Test Shop.',
    );
  });

  it('sends nothing for being called when nobody was waiting', async () => {
    const fx = await seedQueue();
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);

    expect(sent).toEqual([]);
  });
});

describe('the language a notification is written in', () => {
  it('is Danish by default, with a link to the Danish page', async () => {
    const fx = await seedQueue();
    await join(fx, 1, 'one@example.com', null);
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);

    expect(sent[0]).toMatchObject({
      title: 'Det er din tur',
      body: 'Customer 1, du bliver kaldt op hos Test Shop.',
    });
    expect(sent[0]?.url).toMatch(new RegExp(`[^n]/q/${fx.shopId}/${fx.queueId}$`));
  });

  it('follows the language chosen when turning notifications on', async () => {
    // Joined in Danish, then turned notifications on while reading English:
    // the later, deliberate choice wins.
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 300 });
    await join(fx, 1);
    const second = await join(fx, 2, undefined, 'da');
    await performRegisterPushToken(testDb, phone(2), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: second.ticketId,
      token: 'token-two',
      locale: 'en',
    });
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);

    const next = sent.find((n) => n.to === 'token-two');
    expect(next?.title).toBe('You’re next');
    expect(next?.url).toContain(`/en/q/${fx.shopId}/${fx.queueId}`);
    expect((await ticketContact(fx, second.ticketId)).locale).toBe('en');
  });

  it('writes the position alerts in Danish too, estimate and all', async () => {
    const fx = await seedQueue({}, { avgServiceTimeSeconds: 300 });
    for (let n = 1; n <= 5; n++) await join(fx, n, `c${n}@example.com`, 'da');
    const station = await seedStation(fx, 'Till 1');

    await call(fx, station);

    const toFive = sent.find((n) => n.to === 'c5@example.com');
    expect(toFive?.title).toBe('3 personer foran dig');
    expect(toFive?.body).toMatch(/Anslået ventetid: cirka 15 min\. Det er kun et skøn/);
    expect(sent.find((n) => n.to === 'c2@example.com')?.title).toBe('Du er den næste');
  });

  it('ignores a language it does not speak', async () => {
    const fx = await seedQueue();
    const ticket = await join(fx, 1, undefined, 'xx');
    expect((await ticketContact(fx, ticket.ticketId)).locale).toBeNull();
  });
});
