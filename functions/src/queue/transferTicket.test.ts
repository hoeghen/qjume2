import { beforeEach, describe, expect, it } from 'vitest';
import { performJoinQueue } from './joinQueue.js';
import { performLeaveQueue } from './leaveQueue.js';
import {
  TRANSFER_TTL_MS,
  performClaimTransfer,
  performStartTransfer,
} from './transferTicket.js';
import { clearFirestore, seedQueue, testDb, ticketContact, type Fixture } from '../test/harness.js';

// Safari and the Home Screen app on one iPhone sign in separately, so they
// are two different anonymous users as far as the server can tell.
const safari = { uid: 'safari-uid', isAnonymous: true };
const app = { uid: 'app-uid', isAnonymous: true };
const TOKEN = 'k2F9xQ7mR4tY8wB1nC6vZ3hJ';

beforeEach(clearFirestore);

async function joinInSafari(fx: Fixture) {
  return performJoinQueue(testDb, safari, {
    shopId: fx.shopId,
    queueId: fx.queueId,
    displayName: 'Marta',
  });
}

const ids = (fx: Fixture, ticketId: string) => ({
  shopId: fx.shopId,
  queueId: fx.queueId,
  ticketId,
});

describe('moving a place from Safari to the installed app', () => {
  it('hands the ticket to the app, which can then act on it, and Safari no longer can', async () => {
    const fx = await seedQueue();
    const ticket = await joinInSafari(fx);
    await performStartTransfer(testDb, safari, { ...ids(fx, ticket.ticketId), token: TOKEN });

    const claimed = await performClaimTransfer(testDb, app, { ...ids(fx, ticket.ticketId), token: TOKEN });

    expect(claimed).toEqual({ ticketId: ticket.ticketId, displayName: 'Marta' });
    const contact = await ticketContact(fx, ticket.ticketId);
    expect(contact.anonymousId).toBe('app-uid');
    expect(contact.transferTokenHash).toBeNull();
    await expect(
      performLeaveQueue(testDb, safari, ids(fx, ticket.ticketId)),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('works once only', async () => {
    const fx = await seedQueue();
    const ticket = await joinInSafari(fx);
    await performStartTransfer(testDb, safari, { ...ids(fx, ticket.ticketId), token: TOKEN });
    await performClaimTransfer(testDb, app, { ...ids(fx, ticket.ticketId), token: TOKEN });

    await expect(
      performClaimTransfer(testDb, { uid: 'someone-else', isAnonymous: true }, {
        ...ids(fx, ticket.ticketId),
        token: TOKEN,
      }),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('refuses a wrong or expired token', async () => {
    const fx = await seedQueue();
    const ticket = await joinInSafari(fx);
    const start = 1_000_000;
    await performStartTransfer(testDb, safari, { ...ids(fx, ticket.ticketId), token: TOKEN }, start);

    await expect(
      performClaimTransfer(testDb, app, { ...ids(fx, ticket.ticketId), token: `${TOKEN}x` }, start),
    ).rejects.toMatchObject({ code: 'not-found' });
    await expect(
      performClaimTransfer(testDb, app, { ...ids(fx, ticket.ticketId), token: TOKEN }, start + TRANSFER_TTL_MS + 1),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('only lets the ticket’s owner start one, and only with a long token', async () => {
    const fx = await seedQueue();
    const ticket = await joinInSafari(fx);

    await expect(
      performStartTransfer(testDb, app, { ...ids(fx, ticket.ticketId), token: TOKEN }),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(
      performStartTransfer(testDb, safari, { ...ids(fx, ticket.ticketId), token: 'K3' }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('keeps the place the app already joined with rather than holding two', async () => {
    const fx = await seedQueue();
    const ticket = await joinInSafari(fx);
    await performStartTransfer(testDb, safari, { ...ids(fx, ticket.ticketId), token: TOKEN });
    await performJoinQueue(testDb, app, { shopId: fx.shopId, queueId: fx.queueId, displayName: 'Marta' });

    await expect(
      performClaimTransfer(testDb, app, { ...ids(fx, ticket.ticketId), token: TOKEN }),
    ).rejects.toMatchObject({ code: 'already-exists' });
  });

  it('refuses a ticket that has already ended', async () => {
    const fx = await seedQueue();
    const ticket = await joinInSafari(fx);
    await performStartTransfer(testDb, safari, { ...ids(fx, ticket.ticketId), token: TOKEN });
    await performLeaveQueue(testDb, safari, ids(fx, ticket.ticketId));

    await expect(
      performClaimTransfer(testDb, app, { ...ids(fx, ticket.ticketId), token: TOKEN }),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});
