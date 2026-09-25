import { mockStore, mockId } from './store.js';
import { placesToMoveBack } from '../queue/penalties.js';
import { nextPosition, positionAtBack, positionBetween } from '../queue/positions.js';
import { foldSample, isUsableSample } from '../queue/serviceTime.js';
import {
  NO_SHOW_REMOVAL_THRESHOLD,
  type AdminAction,
  type Queue,
  type Shop,
  type StaffMember,
  type Station,
  type Ticket,
  type TicketContact,
} from '../../types/index.js';

/**
 * The mock's one platform admin, matching `LOCAL_USERS.admin` in lib/auth.ts.
 *
 * The mock doesn't enforce who is calling any of its functions — see
 * CLAUDE.md's "Two backends, one app" — so this is not a trust boundary,
 * just what makes an audit entry attributable to somebody instead of no one.
 */
const MOCK_ADMIN = { uid: 'local-admin', email: 'admin@qjume.local' };

function logAdminAction(input: {
  action: AdminAction;
  shopId: string;
  queueId?: string | null;
  summary: string;
  changes?: Record<string, { before: unknown; after: unknown }> | null;
}): void {
  mockStore.set(`adminAuditLog/${mockId('log')}`, {
    action: input.action,
    adminUid: MOCK_ADMIN.uid,
    adminEmail: MOCK_ADMIN.email,
    shopId: input.shopId,
    queueId: input.queueId ?? null,
    summary: input.summary,
    changes: input.changes ?? null,
    at: Date.now(),
  } as unknown as Record<string, unknown>);
}

function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { before: unknown; after: unknown }> {
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = { before: before[key] ?? null, after: after[key] };
    }
  }
  return changes;
}

/**
 * The browser-side implementation of the Cloud Functions.
 *
 * Same call signatures, same ordering rules — `positions`, `penalties` and
 * `serviceTime` are the very modules the deployed functions use. What is gone
 * is everything that existed for trust or for secrets: no plan enforcement, no
 * payment verification, no email or push. In a single browser tab there is
 * nobody to keep honest.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function mockResumeCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

class MockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MockError';
  }
}

const qPath = (shopId: string, queueId: string) =>
  `shops/${shopId}/queues/${queueId}`;
const tPath = (shopId: string, queueId: string, ticketId: string) =>
  `${qPath(shopId, queueId)}/tickets/${ticketId}`;

function readQueue(shopId: string, queueId: string): Queue {
  const queue = mockStore.get<Queue>(qPath(shopId, queueId));
  if (!queue) throw new MockError('Queue not found.');
  return queue;
}

function waitingTickets(shopId: string, queueId: string) {
  return mockStore
    .list<Ticket>(`${qPath(shopId, queueId)}/tickets`)
    .filter((t) => t.state === 'waiting')
    .sort((a, b) => a.position - b.position);
}

function issueTicket(
  shopId: string,
  queueId: string,
  displayName: string,
  holderKey: string | null,
  email: string | null,
  /**
   * The person is in the shop — staff added them, or they scanned the QR code
   * on the monitor. Drain mode stops remote joiners, not those already there.
   */
  atCounter: boolean,
): { ticketId: string; number: number; resumeCode: string } {
  const shop = mockStore.get<Shop>(`shops/${shopId}`);
  if (shop?.suspended) {
    // Checked on the live shop, like the Cloud Function — the denormalised
    // `shopSuspended` on the queue is for discovery's filter only.
    throw new MockError('This queue is not accepting new joiners.');
  }

  const queue = readQueue(shopId, queueId);
  if (queue.status !== 'open' && !(atCounter && queue.status === 'drainMode')) {
    throw new MockError(
      queue.status === 'unavailable'
        ? 'This queue is temporarily unavailable.'
        : 'This queue is not accepting new joiners.',
    );
  }
  if (queue.waitingCount >= queue.maxSize) {
    throw new MockError('This queue is full.');
  }

  const ticketId = mockId('ticket');
  const number = queue.lastIssuedNumber + 1;
  const position = nextPosition(queue.lastPosition);
  const resumeCode = mockResumeCode();

  const ticket: Ticket = {
    displayName,
    number,
    position,
    state: 'waiting',
    noShowCount: 0,
    station: null,
    joinedAt: Date.now(),
    calledAt: null,
    holderKey,
  };
  mockStore.set(tPath(shopId, queueId, ticketId), ticket as unknown as Record<string, unknown>);

  const contact: TicketContact = {
    customerUid: null,
    anonymousId: holderKey,
    resumeCodeHash: resumeCode,
    email,
    phone: null,
    fcmTokens: [],
    dispatchedMilestones: [],
  };
  mockStore.set(
    `${tPath(shopId, queueId, ticketId)}/private/contact`,
    contact as unknown as Record<string, unknown>,
  );

  mockStore.update(qPath(shopId, queueId), {
    lastIssuedNumber: number,
    lastPosition: position,
    waitingCount: queue.waitingCount + 1,
  });

  return { ticketId, number, resumeCode };
}

/**
 * Taking a ticket out of the queue. `left` is the customer's own choice,
 * `removed` is the shop ejecting them — the states differ so the two are
 * still distinguishable afterwards.
 */
function release(
  shopId: string,
  queueId: string,
  ticketId: string,
  state: 'left' | 'removed',
) {
  const ticket = mockStore.get<Ticket>(tPath(shopId, queueId, ticketId));
  if (!ticket) throw new MockError('Ticket not found.');
  if (ticket.state !== 'waiting' && ticket.state !== 'serving') {
    throw new MockError('This ticket is no longer active.');
  }
  mockStore.update(tPath(shopId, queueId, ticketId), { state, station: null });
  if (ticket.state === 'waiting') {
    const queue = readQueue(shopId, queueId);
    mockStore.update(qPath(shopId, queueId), {
      waitingCount: Math.max(0, queue.waitingCount - 1),
    });
  }
  if (ticket.state === 'serving' && ticket.station) {
    mockStore.update(`${qPath(shopId, queueId)}/stations/${ticket.station}`, {
      currentTicketId: null,
    });
  }
  return { ok: true } as const;
}

export const mockApi = {
  joinQueue({ shopId, queueId, displayName, email, atCounter }: {
    shopId: string;
    queueId: string;
    displayName: string;
    email?: string;
    atCounter?: boolean;
  }) {
    const holder = 'local-visitor';
    const existing = mockStore
      .list<Ticket>(`${qPath(shopId, queueId)}/tickets`)
      .find(
        (t) =>
          t.holderKey === holder &&
          (t.state === 'waiting' || t.state === 'serving'),
      );
    if (existing) throw new MockError('You are already in this queue.');
    return issueTicket(
      shopId,
      queueId,
      displayName,
      holder,
      email ?? null,
      atCounter === true,
    );
  },

  addWalkIn({ shopId, queueId, displayName }: {
    shopId: string;
    queueId: string;
    displayName: string;
  }) {
    return issueTicket(shopId, queueId, displayName, null, null, true);
  },

  /** The same resolve-then-assign step the real `callNext` performs. */
  callNext({ shopId, queueId, stationId, outcome = 'served' }: {
    shopId: string;
    queueId: string;
    stationId: string;
    outcome?: 'served' | 'noShow';
  }) {
    const queue = readQueue(shopId, queueId);
    const stationPath = `${qPath(shopId, queueId)}/stations/${stationId}`;
    const station = mockStore.get<Station>(stationPath);
    if (!station) throw new MockError('Station not found.');

    const waiting = waitingTickets(shopId, queueId);
    let penalisedId: string | null = null;
    let waitingDelta = 0;
    let observed: { averageSeconds: number; sampleCount: number } | null = null;
    let resolved: {
      ticketId: string;
      outcome: 'served' | 'noShow';
      removed: boolean;
      noShowCount: number;
    } | null = null;

    const currentId = station.currentTicketId;
    const current = currentId
      ? mockStore.get<Ticket>(tPath(shopId, queueId, currentId))
      : null;

    if (current && currentId) {
      if (outcome === 'served') {
        mockStore.update(tPath(shopId, queueId, currentId), {
          state: 'served',
          station: null,
        });
        resolved = {
          ticketId: currentId,
          outcome: 'served',
          removed: false,
          noShowCount: current.noShowCount,
        };
        if (current.calledAt !== null) {
          const sample = (Date.now() - current.calledAt) / 1000;
          if (isUsableSample(sample)) {
            observed = foldSample(
              {
                averageSeconds:
                  queue.observedServiceTimeSeconds ?? queue.avgServiceTimeSeconds,
                sampleCount: queue.servedSampleCount,
              },
              sample,
            );
          }
        }
      } else {
        const noShowCount = current.noShowCount + 1;
        const removed = noShowCount >= NO_SHOW_REMOVAL_THRESHOLD;
        if (removed) {
          mockStore.update(tPath(shopId, queueId, currentId), {
            state: 'removed',
            noShowCount,
            station: null,
          });
        } else {
          penalisedId = currentId;
          waitingDelta += 1;
          const places = placesToMoveBack(queue.noShowPenalty);
          let position: number;
          if (waiting.length === 0) {
            position = current.position;
          } else if (places >= waiting.length) {
            position = positionAtBack(queue.lastPosition);
          } else {
            const before = (waiting[places - 1] as Ticket).position;
            const after = (waiting[places] as Ticket).position;
            position = positionBetween(before, after) ?? positionAtBack(queue.lastPosition);
          }
          mockStore.update(tPath(shopId, queueId, currentId), {
            state: 'waiting',
            noShowCount,
            station: null,
            position,
          });
          if (position > queue.lastPosition) {
            mockStore.update(qPath(shopId, queueId), { lastPosition: position });
          }
        }
        resolved = { ticketId: currentId, outcome: 'noShow', removed, noShowCount };
      }
    }

    // A ticket just sent back is not handed straight back to the same station.
    const next = waiting.find((t) => t.id !== penalisedId) ?? null;
    if (next) {
      mockStore.update(tPath(shopId, queueId, next.id), {
        state: 'serving',
        station: stationId,
        calledAt: Date.now(),
      });
      waitingDelta -= 1;
    }
    mockStore.update(stationPath, { currentTicketId: next?.id ?? null });

    const patch: Record<string, unknown> = { lastServedAt: Date.now() };
    if (waitingDelta !== 0) {
      patch['waitingCount'] = Math.max(0, queue.waitingCount + waitingDelta);
    }
    if (next) patch['currentNumber'] = next.number;
    if (observed) {
      patch['observedServiceTimeSeconds'] = observed.averageSeconds;
      patch['servedSampleCount'] = observed.sampleCount;
    }
    mockStore.update(qPath(shopId, queueId), patch);

    return {
      ticketId: next?.id ?? null,
      displayName: next?.displayName ?? null,
      resolved,
    };
  },

  leaveQueue({ shopId, queueId, ticketId }: {
    shopId: string;
    queueId: string;
    ticketId: string;
  }) {
    return release(shopId, queueId, ticketId, 'left');
  },

  removeTicket({ shopId, queueId, ticketId }: {
    shopId: string;
    queueId: string;
    ticketId: string;
  }) {
    return release(shopId, queueId, ticketId, 'removed');
  },

  relinkTicket({ shopId, queueId, ticketId }: {
    shopId: string;
    queueId: string;
    ticketId: string;
  }) {
    const ticket = mockStore.get<Ticket>(tPath(shopId, queueId, ticketId));
    if (!ticket) throw new MockError('Ticket not found.');
    const resumeCode = mockResumeCode();
    mockStore.update(`${tPath(shopId, queueId, ticketId)}/private/contact`, {
      resumeCodeHash: resumeCode,
    });
    return { resumeCode, displayName: ticket.displayName };
  },

  claimTicket({ shopId, queueId, resumeCode }: {
    shopId: string;
    queueId: string;
    resumeCode: string;
  }) {
    const wanted = resumeCode.trim().toUpperCase();
    const tickets = mockStore.list<Ticket>(`${qPath(shopId, queueId)}/tickets`);
    for (const ticket of tickets) {
      const contact = mockStore.get<TicketContact>(
        `${tPath(shopId, queueId, ticket.id)}/private/contact`,
      );
      if (contact?.resumeCodeHash !== wanted) continue;
      if (ticket.state !== 'waiting' && ticket.state !== 'serving') {
        throw new MockError('That ticket is no longer active.');
      }
      mockStore.update(tPath(shopId, queueId, ticket.id), {
        holderKey: 'local-visitor',
      });
      mockStore.update(`${tPath(shopId, queueId, ticket.id)}/private/contact`, {
        anonymousId: 'local-visitor',
      });
      return {
        ticketId: ticket.id,
        displayName: ticket.displayName,
        number: ticket.number,
      };
    }
    throw new MockError('That code does not match a ticket in this queue.');
  },

  suggestAddresses(_input: { query: string }) {
    // Real suggestions need a geocoding API key, which the mock has none
    // of - same reason createQueue below drops a queue near the others
    // rather than inventing a real location. An empty list is honest here:
    // there is no fake "real address" that wouldn't be misleading.
    return { suggestions: [] as { formatted: string; lat: number; lng: number }[] };
  },

  createQueue(input: {
    shopId: string;
    name: string;
    address: string;
    category: Queue['category'];
    maxSize: number;
    avgServiceTimeSeconds: number;
    noShowPenalty: Queue['noShowPenalty'];
    description?: string | null;
  }) {
    const shop = mockStore.get<Shop>(`shops/${input.shopId}`);
    if (!shop) throw new MockError('Shop not found.');
    const queueId = mockId('queue');
    const queue: Queue = {
      name: input.name,
      shopName: shop.name,
      shopSuspended: shop.suspended === true,
      description: input.description ?? null,
      category: input.category,
      maxSize: input.maxSize,
      address: input.address,
      // Geocoding needs an API key, so the mock backend drops the queue near the
      // others rather than inventing a location far away.
      lat: 51.5072 + (Math.random() - 0.5) * 0.06,
      lng: -0.1276 + (Math.random() - 0.5) * 0.06,
      geohash: mockId('gh'),
      avgServiceTimeSeconds: input.avgServiceTimeSeconds,
      noShowPenalty: input.noShowPenalty,
      status: 'closed',
      schedule: null,
      currentNumber: 0,
      lastIssuedNumber: 0,
      lastPosition: 0,
      lastServedAt: null,
      observedServiceTimeSeconds: null,
      servedSampleCount: 0,
      waitingCount: 0,
    };
    mockStore.set(qPath(input.shopId, queueId), queue as unknown as Record<string, unknown>);
    return { queueId, geocoded: null };
  },

  updateQueue({ shopId, queueId, ...settings }: {
    shopId: string;
    queueId: string;
    name: string;
    address: string;
    category: Queue['category'];
    maxSize: number;
    avgServiceTimeSeconds: number;
    noShowPenalty: Queue['noShowPenalty'];
    description?: string | null;
  }) {
    mockStore.update(qPath(shopId, queueId), {
      ...settings,
      description: settings.description ?? null,
    });
    return { geocoded: null };
  },

  claimStation({ shopId, queueId, stationId, label }: {
    shopId: string;
    queueId: string;
    stationId?: string;
    label?: string;
  }) {
    const collection = `${qPath(shopId, queueId)}/stations`;
    if (stationId) {
      const existing = mockStore.get<Station>(`${collection}/${stationId}`);
      if (!existing) throw new MockError('Station not found.');
      return { stationId, label: existing.label };
    }
    const count = mockStore.list<Station>(collection).length;
    const id = mockId('station');
    const resolved = label?.trim() || `Till ${count + 1}`;
    const station: Station = {
      label: resolved,
      activeStaffUid: 'local-owner',
      currentTicketId: null,
    };
    mockStore.set(`${collection}/${id}`, station as unknown as Record<string, unknown>);
    return { stationId: id, label: resolved };
  },

  closeQueue({ shopId, queueId, mode }: {
    shopId: string;
    queueId: string;
    mode: 'drain' | 'hard';
  }) {
    if (mode === 'drain') {
      mockStore.update(qPath(shopId, queueId), { status: 'drainMode' });
      return { clearedCount: 0 };
    }
    const waiting = waitingTickets(shopId, queueId);
    for (const ticket of waiting) {
      mockStore.update(tPath(shopId, queueId, ticket.id), {
        state: 'removed',
        station: null,
      });
    }
    mockStore.update(qPath(shopId, queueId), {
      status: 'closed',
      waitingCount: 0,
      currentNumber: 0,
    });
    return { clearedCount: waiting.length };
  },

  addStaff({ shopId, email }: { shopId: string; email: string }) {
    const uid = mockId('staff');
    const member: StaffMember = {
      email,
      addedAt: Date.now(),
      addedBy: 'local-owner',
    };
    mockStore.set(
      `shops/${shopId}/staff/${uid}`,
      member as unknown as Record<string, unknown>,
    );
    return { uid };
  },

  removeStaff({ shopId, uid }: { shopId: string; uid: string }) {
    mockStore.delete(`shops/${shopId}/staff/${uid}`);
    return { ok: true } as const;
  },

  startCheckout({ shopId, plan }: { shopId: string; plan: 'free' | 'paid' }) {
    // No provider and no money. The mock backend changes the plan on the spot, which
    // is exactly what the real build refuses to do.
    mockStore.update(`shops/${shopId}`, { plan });
    return { url: '/shop/billing' };
  },

  completeCheckout() {
    return { plan: 'paid' as const };
  },

  registerPushToken() {
    // there is no push without a Firebase project; the mock accepts and
    // forgets, so the button behaves rather than erroring.
    return { ok: true } as const;
  },

  suspendShop({ shopId }: { shopId: string }) {
    return setShopSuspension(shopId, true);
  },

  reinstateShop({ shopId }: { shopId: string }) {
    return setShopSuspension(shopId, false);
  },

  adminUpdateShop({
    shopId,
    name,
    exclusiveQueues,
    profile,
  }: {
    shopId: string;
    name: string;
    exclusiveQueues: boolean;
    profile?: Shop['profile'];
  }) {
    const shop = mockStore.get<Shop>(`shops/${shopId}`);
    if (!shop) throw new MockError('Shop not found.');

    const before = {
      name: shop.name,
      exclusiveQueues: shop.exclusiveQueues,
      profile: shop.profile ?? null,
    };
    const after = {
      name,
      exclusiveQueues,
      profile: profile ?? null,
    };
    mockStore.update(`shops/${shopId}`, after);

    const changes = diffFields(before, after);
    if (Object.keys(changes).length > 0) {
      logAdminAction({
        action: 'shop.update',
        shopId,
        summary: `Edited ${shop.name}`,
        changes,
      });
    }
  },

  adminUpdateQueue({
    shopId,
    queueId,
    name,
    address,
    category,
    maxSize,
    avgServiceTimeSeconds,
    noShowPenalty,
    description,
  }: {
    shopId: string;
    queueId: string;
    name: string;
    address: string;
    category: Queue['category'];
    maxSize: number;
    avgServiceTimeSeconds: number;
    noShowPenalty: Queue['noShowPenalty'];
    description?: string | null;
  }) {
    const existing = readQueue(shopId, queueId);

    const before = {
      name: existing.name,
      address: existing.address,
      category: existing.category,
      maxSize: existing.maxSize,
      avgServiceTimeSeconds: existing.avgServiceTimeSeconds,
      noShowPenalty: existing.noShowPenalty,
      description: existing.description,
    };
    const after = {
      name,
      address,
      category,
      maxSize,
      avgServiceTimeSeconds,
      noShowPenalty,
      description: description ?? null,
    };
    // The real function re-geocodes on an address change; the mock has no
    // geocoder to call and already places every queue near the others (see
    // `createQueue` above), so the coordinates are simply left alone.
    mockStore.update(qPath(shopId, queueId), after);

    const changes = diffFields(before, after);
    if (Object.keys(changes).length > 0) {
      logAdminAction({
        action: 'queue.update',
        shopId,
        queueId,
        summary: `Edited ${existing.name} at ${existing.shopName}`,
        changes,
      });
    }
    return { geocoded: null };
  },

  adminDeleteShop({ shopId }: { shopId: string }) {
    const shop = mockStore.get<Shop>(`shops/${shopId}`);
    if (!shop) throw new MockError('Shop not found.');

    mockStore.deletePrefix(`shops/${shopId}`);

    logAdminAction({
      action: 'shop.delete',
      shopId,
      summary: `Deleted ${shop.name}`,
    });
  },
};

/**
 * Shared by `suspendShop` and `reinstateShop`: flips the shop's own flag and
 * every queue's denormalised copy together, the same as the Cloud Function.
 */
function setShopSuspension(shopId: string, suspended: boolean) {
  const shop = mockStore.get<Shop>(`shops/${shopId}`);
  if (!shop) throw new MockError('Shop not found.');

  mockStore.update(`shops/${shopId}`, { suspended });
  for (const queue of mockStore.list<Queue>(`shops/${shopId}/queues`)) {
    mockStore.update(`shops/${shopId}/queues/${queue.id}`, { shopSuspended: suspended });
  }

  logAdminAction({
    action: suspended ? 'shop.suspend' : 'shop.reinstate',
    shopId,
    summary: `${suspended ? 'Suspended' : 'Reinstated'} ${shop.name}`,
  });
  return { suspended };
}
