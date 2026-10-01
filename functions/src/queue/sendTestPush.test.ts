import { beforeEach, describe, expect, it } from 'vitest';
import { performJoinQueue } from './joinQueue.js';
import { performRegisterPushToken } from './registerPushToken.js';
import { performSendTestPush } from './sendTestPush.js';
import {
  recordingChannels,
  tokenTail,
  type PushChannel,
  type RecordedNotice,
} from '../notifications/channels.js';
import {
  clearFirestore,
  seedQueue,
  testDb,
  ticketContact,
  type Fixture,
} from '../test/harness.js';

const phone = (n: number) => ({ uid: `device-${n}`, isAnonymous: true });
const noSleep = async () => undefined;

let sent: RecordedNotice[];
let push: PushChannel;

beforeEach(async () => {
  await clearFirestore();
  sent = [];
  push = recordingChannels(sent).push;
});

async function joinWithToken(fx: Fixture, token?: string) {
  const ticket = await performJoinQueue(testDb, phone(1), {
    shopId: fx.shopId,
    queueId: fx.queueId,
    displayName: 'Marta',
  });
  if (token) {
    await performRegisterPushToken(testDb, phone(1), {
      shopId: fx.shopId,
      queueId: fx.queueId,
      ticketId: ticket.ticketId,
      token,
    });
  }
  return ticket;
}

describe('sendTestPush', () => {
  it('sends a test notice to the ticket’s own tokens and reports each result', async () => {
    const fx = await seedQueue();
    const ticket = await joinWithToken(fx, 'token-abcdefghijk');

    const result = await performSendTestPush(
      testDb,
      phone(1),
      { shopId: fx.shopId, queueId: fx.queueId, ticketId: ticket.ticketId },
      push,
      noSleep,
    );

    expect(sent).toEqual([
      expect.objectContaining({
        channel: 'push',
        to: 'token-abcdefghijk',
        title: 'Test notification',
        url: expect.stringContaining(`/q/${fx.shopId}/${fx.queueId}`),
      }),
    ]);
    expect(result.results).toEqual([
      { token: tokenTail('token-abcdefghijk'), outcome: 'sent' },
    ]);
    // Never the whole token: the result goes back to a browser and into logs.
    expect(result.results[0]?.token).not.toBe('token-abcdefghijk');
  });

  it('waits the requested delay first, capped so the call cannot outlive its timeout', async () => {
    const fx = await seedQueue();
    const ticket = await joinWithToken(fx, 'token-1');
    const waited: number[] = [];

    await performSendTestPush(
      testDb,
      phone(1),
      {
        shopId: fx.shopId,
        queueId: fx.queueId,
        ticketId: ticket.ticketId,
        delaySeconds: 600,
      },
      push,
      async (ms) => {
        waited.push(ms);
      },
    );

    expect(waited).toEqual([30_000]);
  });

  it('says so, and sends nothing, when the ticket has no tokens', async () => {
    const fx = await seedQueue();
    const ticket = await joinWithToken(fx);

    const result = await performSendTestPush(
      testDb,
      phone(1),
      { shopId: fx.shopId, queueId: fx.queueId, ticketId: ticket.ticketId },
      push,
      noSleep,
    );

    expect(result.results).toEqual([]);
    expect(sent).toEqual([]);
  });

  it('forgets a token FCM reports as stale', async () => {
    const fx = await seedQueue();
    const ticket = await joinWithToken(fx, 'dead-token');
    const stalePush: PushChannel = {
      name: 'stale',
      async send(tokens) {
        return {
          staleTokens: tokens,
          results: tokens.map((t) => ({
            token: tokenTail(t),
            outcome: 'stale' as const,
            code: 'messaging/registration-token-not-registered',
          })),
        };
      },
    };

    const result = await performSendTestPush(
      testDb,
      phone(1),
      { shopId: fx.shopId, queueId: fx.queueId, ticketId: ticket.ticketId },
      stalePush,
      noSleep,
    );

    expect(result.results[0]?.outcome).toBe('stale');
    expect((await ticketContact(fx, ticket.ticketId)).fcmTokens).toEqual([]);
  });

  it('refuses anyone but the ticket’s owner', async () => {
    const fx = await seedQueue();
    const ticket = await joinWithToken(fx, 'token-1');

    await expect(
      performSendTestPush(
        testDb,
        phone(2),
        { shopId: fx.shopId, queueId: fx.queueId, ticketId: ticket.ticketId },
        push,
        noSleep,
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(sent).toEqual([]);
  });
});
