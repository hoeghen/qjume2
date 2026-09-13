import { demoStore, demoId } from './store.js';
import { placesToMoveBack } from '../queue/penalties.js';
import { nextPosition, positionAtBack, positionBetween } from '../queue/positions.js';
import { foldSample, isUsableSample } from '../queue/serviceTime.js';
import {
  NO_SHOW_REMOVAL_THRESHOLD,
  type Queue,
  type Shop,
  type StaffMember,
  type Station,
  type Ticket,
  type TicketContact,
} from '../../types/index.js';

/**
 * The demo's stand-in for the Cloud Functions.
 *
 * Same call signatures, same ordering rules — `positions`, `penalties` and
 * `serviceTime` are the very modules the deployed functions use. What is gone
 * is everything that existed for trust or for secrets: no plan enforcement, no
 * payment verification, no email or push. In a single browser tab there is
 * nobody to keep honest.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function demoResumeCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

class DemoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoError';
  }
}

const qPath = (shopId: string, queueId: string) =>
  `shops/${shopId}/queues/${queueId}`;
const tPath = (shopId: string, queueId: string, ticketId: string) =>
  `${qPath(shopId, queueId)}/tickets/${ticketId}`;

function readQueue(shopId: string, queueId: string): Queue {
  const queue = demoStore.get<Queue>(qPath(shopId, queueId));
  if (!queue) throw new DemoError('Queue not found.');
  return queue;
}

function waitingTickets(shopId: string, queueId: string) {
  return demoStore
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
): { ticketId: string; number: number; resumeCode: string } {
  const queue = readQueue(shopId, queueId);
  if (queue.status !== 'open' && !(holderKey === null && queue.status === 'drainMode')) {
    throw new DemoError(
      queue.status === 'unavailable'
        ? 'This queue is temporarily unavailable.'
        : 'This queue is not accepting new joiners.',
    );
  }
  if (queue.waitingCount >= queue.maxSize) {
    throw new DemoError('This queue is full.');
  }

  const ticketId = demoId('ticket');
  const number = queue.lastIssuedNumber + 1;
  const position = nextPosition(queue.lastPosition);
  const resumeCode = demoResumeCode();

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
  demoStore.set(tPath(shopId, queueId, ticketId), ticket as unknown as Record<string, unknown>);

  const contact: TicketContact = {
    customerUid: null,
    anonymousId: holderKey,
    resumeCodeHash: resumeCode,
    email,
    phone: null,
    fcmTokens: [],
    dispatchedMilestones: [],
  };
  demoStore.set(
    `${tPath(shopId, queueId, ticketId)}/private/contact`,
    contact as unknown as Record<string, unknown>,
  );

  demoStore.update(qPath(shopId, queueId), {
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
  const ticket = demoStore.get<Ticket>(tPath(shopId, queueId, ticketId));
  if (!ticket) throw new DemoError('Ticket not found.');
  if (ticket.state !== 'waiting' && ticket.state !== 'serving') {
    throw new DemoError('This ticket is no longer active.');
  }
  demoStore.update(tPath(shopId, queueId, ticketId), { state, station: null });
  if (ticket.state === 'waiting') {
    const queue = readQueue(shopId, queueId);
    demoStore.update(qPath(shopId, queueId), {
      waitingCount: Math.max(0, queue.waitingCount - 1),
    });
  }
  if (ticket.state === 'serving' && ticket.station) {
    demoStore.update(`${qPath(shopId, queueId)}/stations/${ticket.station}`, {
      currentTicketId: null,
    });
  }
  return { ok: true } as const;
}

export const demoApi = {
  joinQueue({ shopId, queueId, displayName, email }: {
    shopId: string;
    queueId: string;
    displayName: string;
    email?: string;
  }) {
    const holder = 'demo-visitor';
    const existing = demoStore
      .list<Ticket>(`${qPath(shopId, queueId)}/tickets`)
      .find(
        (t) =>
          t.holderKey === holder &&
          (t.state === 'waiting' || t.state === 'serving'),
      );
    if (existing) throw new DemoError('You are already in this queue.');
    return issueTicket(shopId, queueId, displayName, holder, email ?? null);
  },

  addWalkIn({ shopId, queueId, displayName }: {
    shopId: string;
    queueId: string;
    displayName: string;
  }) {
    return issueTicket(shopId, queueId, displayName, null, null);
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
    const station = demoStore.get<Station>(stationPath);
    if (!station) throw new DemoError('Station not found.');

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
      ? demoStore.get<Ticket>(tPath(shopId, queueId, currentId))
      : null;

    if (current && currentId) {
      if (outcome === 'served') {
        demoStore.update(tPath(shopId, queueId, currentId), {
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
          demoStore.update(tPath(shopId, queueId, currentId), {
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
          demoStore.update(tPath(shopId, queueId, currentId), {
            state: 'waiting',
            noShowCount,
            station: null,
            position,
          });
          if (position > queue.lastPosition) {
            demoStore.update(qPath(shopId, queueId), { lastPosition: position });
          }
        }
        resolved = { ticketId: currentId, outcome: 'noShow', removed, noShowCount };
      }
    }

    // A ticket just sent back is not handed straight back to the same station.
    const next = waiting.find((t) => t.id !== penalisedId) ?? null;
    if (next) {
      demoStore.update(tPath(shopId, queueId, next.id), {
        state: 'serving',
        station: stationId,
        calledAt: Date.now(),
      });
      waitingDelta -= 1;
    }
    demoStore.update(stationPath, { currentTicketId: next?.id ?? null });

    const patch: Record<string, unknown> = { lastServedAt: Date.now() };
    if (waitingDelta !== 0) {
      patch['waitingCount'] = Math.max(0, queue.waitingCount + waitingDelta);
    }
    if (next) patch['currentNumber'] = next.number;
    if (observed) {
      patch['observedServiceTimeSeconds'] = observed.averageSeconds;
      patch['servedSampleCount'] = observed.sampleCount;
    }
    demoStore.update(qPath(shopId, queueId), patch);

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
    const ticket = demoStore.get<Ticket>(tPath(shopId, queueId, ticketId));
    if (!ticket) throw new DemoError('Ticket not found.');
    const resumeCode = demoResumeCode();
    demoStore.update(`${tPath(shopId, queueId, ticketId)}/private/contact`, {
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
    const tickets = demoStore.list<Ticket>(`${qPath(shopId, queueId)}/tickets`);
    for (const ticket of tickets) {
      const contact = demoStore.get<TicketContact>(
        `${tPath(shopId, queueId, ticket.id)}/private/contact`,
      );
      if (contact?.resumeCodeHash !== wanted) continue;
      if (ticket.state !== 'waiting' && ticket.state !== 'serving') {
        throw new DemoError('That ticket is no longer active.');
      }
      demoStore.update(tPath(shopId, queueId, ticket.id), {
        holderKey: 'demo-visitor',
      });
      demoStore.update(`${tPath(shopId, queueId, ticket.id)}/private/contact`, {
        anonymousId: 'demo-visitor',
      });
      return {
        ticketId: ticket.id,
        displayName: ticket.displayName,
        number: ticket.number,
      };
    }
    throw new DemoError('That code does not match a ticket in this queue.');
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
    const shop = demoStore.get<Shop>(`shops/${input.shopId}`);
    if (!shop) throw new DemoError('Shop not found.');
    const queueId = demoId('queue');
    const queue: Queue = {
      name: input.name,
      shopName: shop.name,
      description: input.description ?? null,
      category: input.category,
      maxSize: input.maxSize,
      address: input.address,
      // Geocoding needs an API key, so the demo drops the queue near the
      // others rather than inventing a location far away.
      lat: 51.5072 + (Math.random() - 0.5) * 0.06,
      lng: -0.1276 + (Math.random() - 0.5) * 0.06,
      geohash: demoId('gh'),
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
    demoStore.set(qPath(input.shopId, queueId), queue as unknown as Record<string, unknown>);
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
    demoStore.update(qPath(shopId, queueId), {
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
      const existing = demoStore.get<Station>(`${collection}/${stationId}`);
      if (!existing) throw new DemoError('Station not found.');
      return { stationId, label: existing.label };
    }
    const count = demoStore.list<Station>(collection).length;
    const id = demoId('station');
    const resolved = label?.trim() || `Till ${count + 1}`;
    const station: Station = {
      label: resolved,
      activeStaffUid: 'demo-owner',
      currentTicketId: null,
    };
    demoStore.set(`${collection}/${id}`, station as unknown as Record<string, unknown>);
    return { stationId: id, label: resolved };
  },

  closeQueue({ shopId, queueId, mode }: {
    shopId: string;
    queueId: string;
    mode: 'drain' | 'hard';
  }) {
    if (mode === 'drain') {
      demoStore.update(qPath(shopId, queueId), { status: 'drainMode' });
      return { clearedCount: 0 };
    }
    const waiting = waitingTickets(shopId, queueId);
    for (const ticket of waiting) {
      demoStore.update(tPath(shopId, queueId, ticket.id), {
        state: 'removed',
        station: null,
      });
    }
    demoStore.update(qPath(shopId, queueId), {
      status: 'closed',
      waitingCount: 0,
      currentNumber: 0,
    });
    return { clearedCount: waiting.length };
  },

  addStaff({ shopId, email }: { shopId: string; email: string }) {
    const uid = demoId('staff');
    const member: StaffMember = {
      email,
      addedAt: Date.now(),
      addedBy: 'demo-owner',
    };
    demoStore.set(
      `shops/${shopId}/staff/${uid}`,
      member as unknown as Record<string, unknown>,
    );
    return { uid };
  },

  removeStaff({ shopId, uid }: { shopId: string; uid: string }) {
    demoStore.delete(`shops/${shopId}/staff/${uid}`);
    return { ok: true } as const;
  },

  startCheckout({ shopId, plan }: { shopId: string; plan: 'free' | 'paid' }) {
    // No provider and no money. The demo changes the plan on the spot, which
    // is exactly what the real build refuses to do.
    demoStore.update(`shops/${shopId}`, { plan });
    return { url: '/shop/billing' };
  },

  completeCheckout() {
    return { plan: 'paid' as const };
  },

  registerPushToken() {
    // There is no push without a Firebase project; the demo accepts and
    // forgets, so the button behaves rather than erroring.
    return { ok: true } as const;
  },
};
