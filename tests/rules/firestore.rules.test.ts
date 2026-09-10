import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

// Resolved from this file, not the working directory, so the suite runs
// the same however it is invoked.
const RULES_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../firestore.rules',
);

const PROJECT_ID = 'qjume-rules-test';
const OWNER = 'owner-uid';
const CUSTOMER = 'customer-uid';
const OTHER = 'other-uid';

const SHOP = 'shops/shop1';
const QUEUE = 'shops/shop1/queues/queue1';
const TICKET = 'shops/shop1/queues/queue1/tickets/ticket1';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(RULES_PATH, 'utf8'),
    },
  });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  // Seed as admin, bypassing rules — this is the state a real queue is in.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, SHOP), { name: 'Shop', ownerUid: OWNER, plan: 'free' });
    await setDoc(doc(db, QUEUE), {
      name: 'Queue',
      status: 'open',
      waitingCount: 3,
      currentNumber: 1,
      lastIssuedNumber: 3,
      lastPosition: 3000,
      lastServedAt: null,
    });
    await setDoc(doc(db, TICKET), {
      displayName: 'Marta',
      state: 'waiting',
      position: 1000,
      noShowCount: 0,
      station: null,
      anonymousId: CUSTOMER,
      customerUid: null,
    });
  });
});

// ---------------------------------------------------------------------------
// The app's main abuse vector: a customer who could write their own ticket
// could set `serving` and jump the queue. See CLAUDE.md invariant 1.
// ---------------------------------------------------------------------------
describe('tickets are server-write-only', () => {
  it('refuses to let a customer mark their own ticket as serving', async () => {
    const db = env.authenticatedContext(CUSTOMER).firestore();
    await assertFails(updateDoc(doc(db, TICKET), { state: 'serving' }));
  });

  it.each(['serving', 'served', 'noShow', 'removed'])(
    'refuses a client write of state=%s',
    async (state) => {
      const db = env.authenticatedContext(CUSTOMER).firestore();
      await assertFails(updateDoc(doc(db, TICKET), { state }));
    },
  );

  it('refuses to let a customer move themselves up the queue', async () => {
    const db = env.authenticatedContext(CUSTOMER).firestore();
    await assertFails(updateDoc(doc(db, TICKET), { position: 0 }));
  });

  it('refuses to let a customer reset their own no-show count', async () => {
    const db = env.authenticatedContext(CUSTOMER).firestore();
    await assertFails(updateDoc(doc(db, TICKET), { noShowCount: 0 }));
  });

  it('refuses ticket writes even from the shop owner', async () => {
    // Not an oversight: the owner serves through callNext, which runs with
    // Admin credentials. No client write path to ticket state exists at all.
    const db = env.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, TICKET), { state: 'served' }));
  });

  it('refuses a client creating a ticket directly', async () => {
    const db = env.authenticatedContext(CUSTOMER).firestore();
    await assertFails(
      setDoc(doc(db, 'shops/shop1/queues/queue1/tickets/forged'), {
        displayName: 'Queue jumper',
        state: 'serving',
        position: 0,
      }),
    );
  });

  it('lets a customer read their own ticket, for live position', async () => {
    const db = env.authenticatedContext(CUSTOMER).firestore();
    await assertSucceeds(getDoc(doc(db, TICKET)));
  });

  it("refuses to let one customer read another's ticket", async () => {
    const db = env.authenticatedContext(OTHER).firestore();
    await assertFails(getDoc(doc(db, TICKET)));
  });

  it('lets the shop owner read tickets in their own queue', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertSucceeds(getDoc(doc(db, TICKET)));
  });
});

describe('queue counters are server-owned', () => {
  it('refuses to let the owner set waitingCount by hand', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, QUEUE), { waitingCount: 0 }));
  });

  it('refuses to let the owner rewrite lastPosition', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, QUEUE), { lastPosition: 1 }));
  });

  it('lets the owner edit their own queue settings', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, QUEUE), { name: 'Renamed', noShowPenalty: 'back3' }),
    );
  });

  it('refuses queue edits by anyone else', async () => {
    const db = env.authenticatedContext(OTHER).firestore();
    await assertFails(updateDoc(doc(db, QUEUE), { name: 'Hijacked' }));
  });
});

describe('discovery', () => {
  it('lets a signed-out visitor read shops and queues', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, SHOP)));
    await assertSucceeds(getDoc(doc(db, QUEUE)));
  });

  it('refuses a signed-out visitor writing a shop', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'shops/forged'), { name: 'Fake' }));
  });

  it('refuses claiming a shop for someone else', async () => {
    const db = env.authenticatedContext(OTHER).firestore();
    await assertFails(
      setDoc(doc(db, 'shops/shop2'), { name: 'Mine', ownerUid: OWNER }),
    );
  });
});
