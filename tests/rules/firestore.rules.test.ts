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
const STATION = 'shops/shop1/queues/queue1/stations/till1';
const CONTACT = 'shops/shop1/queues/queue1/tickets/ticket1/private/contact';
const STAFF = 'shops/shop1/staff/staff-uid';

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
    await setDoc(doc(db, SHOP), {
      name: 'Shop',
      ownerUid: OWNER,
      plan: 'free',
      exclusiveQueues: false,
    });
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
      number: 1,
      state: 'waiting',
      position: 1000,
      noShowCount: 0,
      station: null,
      holderKey: 'opaque-hash',
    });
    await setDoc(doc(db, CONTACT), {
      anonymousId: CUSTOMER,
      customerUid: null,
      resumeCodeHash: 'a'.repeat(64),
      email: 'marta@example.com',
      phone: null,
      fcmTokens: [],
      dispatchedMilestones: [],
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

  it('refuses a client creating the private half directly', async () => {
    const db = env.authenticatedContext(CUSTOMER).firestore();
    await assertFails(
      setDoc(doc(db, CONTACT), { resumeCodeHash: 'b'.repeat(64) }),
    );
  });

  it('refuses a customer rewriting their own resume code', async () => {
    // The code is a credential. Reissuing it is relinkTicket's job.
    const db = env.authenticatedContext(CUSTOMER).firestore();
    await assertFails(
      updateDoc(doc(db, CONTACT), { resumeCodeHash: 'c'.repeat(64) }),
    );
  });
});

// ---------------------------------------------------------------------------
// The public half of a ticket is readable by anyone, because the in-shop
// monitor and live position counting both need it without a sign-in. The
// private half is where anything identifying a person lives.
// ---------------------------------------------------------------------------
describe('what a ticket exposes', () => {
  it('lets a passer-by read the public half, for the monitor', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, TICKET)));
  });

  it('lets a customer count the queue ahead of them', async () => {
    const db = env.authenticatedContext(OTHER).firestore();
    await assertSucceeds(getDoc(doc(db, TICKET)));
  });

  it("refuses a stranger the holder's contact details", async () => {
    const db = env.authenticatedContext(OTHER).firestore();
    await assertFails(getDoc(doc(db, CONTACT)));
  });

  it('refuses a signed-out visitor the contact details', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, CONTACT)));
  });

  it('lets the holder read their own contact details', async () => {
    const db = env.authenticatedContext(CUSTOMER).firestore();
    await assertSucceeds(getDoc(doc(db, CONTACT)));
  });

  it('lets the shop serving them read the contact details', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertSucceeds(getDoc(doc(db, CONTACT)));
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

  it('lets the owner pause and reopen the queue', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertSucceeds(updateDoc(doc(db, QUEUE), { status: 'paused' }));
    await assertSucceeds(updateDoc(doc(db, QUEUE), { status: 'open' }));
  });

  it('rejects a status that is not a real queue state', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, QUEUE), { status: 'bananas' }));
  });

  it('refuses a direct settings write, which would skip geocoding', async () => {
    // Settings go through updateQueue. A direct write could change the address
    // while leaving the old coordinates, listing the queue where it is not.
    const db = env.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, QUEUE), { name: 'Renamed' }));
    await assertFails(updateDoc(doc(db, QUEUE), { address: '9 Elsewhere' }));
  });

  it('refuses the owner moving the queue on the map by hand', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, QUEUE), { lat: 0, lng: 0, geohash: '0000000000' }),
    );
  });

  it('refuses queue edits by anyone else', async () => {
    const db = env.authenticatedContext(OTHER).firestore();
    await assertFails(updateDoc(doc(db, QUEUE), { name: 'Hijacked' }));
  });
});

// ---------------------------------------------------------------------------
// The free-tier limits live in Cloud Functions, so the rules must not leave a
// client write path that walks past them. Invariant 5.
// ---------------------------------------------------------------------------
describe('free-tier limits cannot be bypassed by direct writes', () => {
  it('refuses an owner creating a queue directly', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertFails(
      setDoc(doc(db, 'shops/shop1/queues/queue2'), {
        name: 'Second queue',
        status: 'open',
        waitingCount: 0,
      }),
    );
  });

  it('refuses an owner opening a station directly', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertFails(
      setDoc(doc(db, 'shops/shop1/queues/queue1/stations/till2'), {
        label: 'Till 2',
        activeStaffUid: OWNER,
        currentTicketId: null,
      }),
    );
  });

  it('refuses an owner pointing a station at a ticket by hand', async () => {
    // currentTicketId is queue state; only callNext may move it.
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), STATION), {
        label: 'Till 1',
        activeStaffUid: OWNER,
        currentTicketId: null,
      });
    });
    const db = env.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, STATION), { currentTicketId: 'ticket1' }));
  });

  it('still lets the monitor read stations without signing in', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), STATION), {
        label: 'Till 1',
        activeStaffUid: OWNER,
        currentTicketId: null,
      });
    });
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, STATION)));
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

// ---------------------------------------------------------------------------
// The hinge the free tier hangs on. Every limit — one queue, twenty waiting,
// one server — is enforced by a Cloud Function reading shop.plan. An owner who
// could write that field would lift all of them in a single request, and every
// server-side check would become decoration.
// ---------------------------------------------------------------------------
describe('the plan is not the owner’s to set', () => {
  it('refuses an owner upgrading themselves', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, SHOP), { plan: 'paid' }));
  });

  it('refuses a plan change smuggled alongside a legitimate edit', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, SHOP), { name: 'Renamed', plan: 'paid' }),
    );
  });

  it('refuses a shop created already paid', async () => {
    const db = env.authenticatedContext(OTHER).firestore();
    await assertFails(
      setDoc(doc(db, 'shops/shop9'), {
        name: 'Born Paid',
        ownerUid: OTHER,
        plan: 'paid',
        exclusiveQueues: false,
      }),
    );
  });

  it('allows a shop created on the free plan', async () => {
    const db = env.authenticatedContext(OTHER).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'shops/shop9'), {
        name: 'Honest Shop',
        ownerUid: OTHER,
        plan: 'free',
        exclusiveQueues: false,
      }),
    );
  });

  it('still lets the owner edit everything else', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, SHOP), { name: 'Renamed', exclusiveQueues: true }),
    );
  });

  it('refuses a free shop writing a paid profile', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, SHOP), {
        profile: { logo: null, hours: '9-5', phone: null, description: null },
      }),
    );
  });

  it('allows a profile once the shop is paid', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), SHOP), { plan: 'paid' });
    });
    const db = env.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, SHOP), {
        profile: { logo: null, hours: '9-5', phone: null, description: null },
      }),
    );
  });
});

describe('staff records', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), STAFF), {
        email: 'staff@example.com',
        addedAt: 1,
        addedBy: OWNER,
      });
    });
  });

  it('refuses anyone granting themselves serving rights', async () => {
    const db = env.authenticatedContext(OTHER).firestore();
    await assertFails(
      setDoc(doc(db, 'shops/shop1/staff/' + OTHER), {
        email: 'sneaky@example.com',
        addedAt: 1,
        addedBy: OTHER,
      }),
    );
  });

  it('refuses even the owner writing one directly', async () => {
    // Adding staff is a paid feature, counted server-side.
    const db = env.authenticatedContext(OWNER).firestore();
    await assertFails(
      setDoc(doc(db, 'shops/shop1/staff/someone'), {
        email: 'someone@example.com',
        addedAt: 1,
        addedBy: OWNER,
      }),
    );
  });

  it('lets the owner see who has access', async () => {
    const db = env.authenticatedContext(OWNER).firestore();
    await assertSucceeds(getDoc(doc(db, STAFF)));
  });

  it('lets a staff member see their own record', async () => {
    const db = env.authenticatedContext('staff-uid').firestore();
    await assertSucceeds(getDoc(doc(db, STAFF)));
  });

  it("refuses a stranger the shop's staff list", async () => {
    const db = env.authenticatedContext(OTHER).firestore();
    await assertFails(getDoc(doc(db, STAFF)));
  });

  it('does not let a staff member on a free shop pause the queue', async () => {
    // The shop is on the free plan, so the staff record grants nothing.
    const db = env.authenticatedContext('staff-uid').firestore();
    await assertFails(updateDoc(doc(db, QUEUE), { status: 'paused' }));
  });

  it('lets a staff member on a paid shop pause the queue', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), SHOP), { plan: 'paid' });
    });
    const db = env.authenticatedContext('staff-uid').firestore();
    await assertSucceeds(updateDoc(doc(db, QUEUE), { status: 'paused' }));
  });
});
