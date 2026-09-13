import { demoStore, demoId } from './store.js';
import { firstPosition, nextPosition } from '../queue/positions.js';
import type {
  Queue,
  Shop,
  Station,
  Ticket,
  TicketContact,
} from '../../types/index.js';

/** Roughly central London, so the seeded shops sit a believable distance apart. */
export const DEMO_CENTRE = { lat: 51.5072, lng: -0.1276 };

interface SeedShop {
  shop: string;
  queue: string;
  address: string;
  category: Queue['category'];
  description: string | null;
  lat: number;
  lng: number;
  waiting: string[];
  status: Queue['status'];
  plan: Shop['plan'];
  /** True for the one shop the demo visitor signs in as. */
  yours?: boolean;
}

const SHOPS: SeedShop[] = [
  {
    shop: 'Riverside Pharmacy',
    queue: 'Prescriptions',
    address: '1 River Lane, SE1',
    category: 'health-and-medical',
    description: 'Walk-in flu jab clinic, no appointment needed.',
    lat: 51.5045,
    lng: -0.1215,
    waiting: ['Ana', 'Bilal', 'Chen'],
    status: 'open',
    plan: 'paid',
    // Signing in lands on this one, mid-service, so the shop side has
    // something to do from the first tap.
    yours: true,
  },
  {
    shop: 'Mill Road Bakery',
    queue: 'Counter',
    address: '14 Mill Road, N1',
    category: 'food-and-drink',
    description: null,
    lat: 51.5331,
    lng: -0.1059,
    waiting: ['Dara', 'Eve', 'Femi', 'Gus', 'Hana', 'Ivo'],
    status: 'open',
    plan: 'free',
  },
  {
    shop: 'Town Hall',
    queue: 'Registrations',
    address: '2 Civic Square, WC1',
    category: 'government-and-public-services',
    description: 'Birth, death and marriage certificates.',
    lat: 51.5219,
    lng: -0.1275,
    waiting: ['Jo', 'Kit', 'Lena', 'Mo', 'Nia', 'Omar', 'Pia', 'Quinn'],
    status: 'open',
    plan: 'paid',
  },
  {
    shop: 'Northside Barbers',
    queue: 'Cuts',
    address: '77 High Street, NW1',
    category: 'personal-care',
    description: null,
    lat: 51.5402,
    lng: -0.1433,
    waiting: ['Rae'],
    status: 'drainMode',
    plan: 'free',
  },
  {
    shop: 'Quay Parade Bank',
    queue: 'Enquiries',
    address: '5 Quay Parade, E1',
    category: 'banking-and-finance',
    description: null,
    lat: 51.5118,
    lng: -0.0713,
    waiting: [],
    status: 'closed',
    plan: 'free',
  },
];

/**
 * A geohash good enough for the demo's radius search.
 *
 * The real build derives this with `geofire-common` at save time; here the
 * distance filter runs over a handful of seeded queues in memory, so an
 * ordered encoding of the coordinates is all the sort needs.
 */
function demoGeohash(lat: number, lng: number): string {
  const encode = (value: number, span: number) =>
    Math.round(((value + span) / (span * 2)) * 1e5)
      .toString(36)
      .padStart(5, '0');
  return `${encode(lat, 90)}${encode(lng, 180)}`;
}

let seeded = false;

/** Fills the store with a handful of shops so the demo has something to show. */
export function seedDemo(): void {
  if (seeded) return;
  seeded = true;

  for (const entry of SHOPS) {
    const shopId = demoId('shop');
    const queueId = demoId('queue');

    const shop: Shop = {
      name: entry.shop,
      ownerUid: entry.yours ? 'demo-owner' : `other-${shopId}`,
      plan: entry.plan,
      exclusiveQueues: false,
    };
    demoStore.set(`shops/${shopId}`, shop as unknown as Record<string, unknown>);

    let lastPosition = 0;
    entry.waiting.forEach((displayName, index) => {
      const position =
        index === 0 ? firstPosition() : nextPosition(lastPosition);
      lastPosition = position;
      const ticketId = demoId('ticket');

      const ticket: Ticket = {
        displayName,
        number: index + 1,
        position,
        state: 'waiting',
        noShowCount: 0,
        station: null,
        joinedAt: Date.now() - (entry.waiting.length - index) * 60_000,
        calledAt: null,
        holderKey: null,
      };
      demoStore.set(
        `shops/${shopId}/queues/${queueId}/tickets/${ticketId}`,
        ticket as unknown as Record<string, unknown>,
      );

      const contact: TicketContact = {
        customerUid: null,
        anonymousId: null,
        resumeCodeHash: '',
        email: null,
        phone: null,
        fcmTokens: [],
        dispatchedMilestones: [],
      };
      demoStore.set(
        `shops/${shopId}/queues/${queueId}/tickets/${ticketId}/private/contact`,
        contact as unknown as Record<string, unknown>,
      );
    });

    const queue: Queue = {
      name: entry.queue,
      shopName: entry.shop,
      description: entry.description,
      category: entry.category,
      maxSize: 50,
      address: entry.address,
      lat: entry.lat,
      lng: entry.lng,
      geohash: demoGeohash(entry.lat, entry.lng),
      avgServiceTimeSeconds: 240,
      noShowPenalty: 'back3',
      status: entry.status,
      schedule: null,
      currentNumber: 0,
      lastIssuedNumber: entry.waiting.length,
      lastPosition,
      lastServedAt: null,
      observedServiceTimeSeconds: null,
      servedSampleCount: 0,
      waitingCount: entry.waiting.length,
    };
    demoStore.set(
      `shops/${shopId}/queues/${queueId}`,
      queue as unknown as Record<string, unknown>,
    );

    const station: Station = {
      label: 'Till 1',
      activeStaffUid: entry.yours ? 'demo-owner' : `other-${shopId}`,
      currentTicketId: null,
    };
    demoStore.set(
      `shops/${shopId}/queues/${queueId}/stations/${demoId('station')}`,
      station as unknown as Record<string, unknown>,
    );
  }
}
