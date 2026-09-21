import { mockStore, mockId } from './store.js';
import { firstPosition, nextPosition } from '../queue/positions.js';
import type {
  Queue,
  Shop,
  Station,
  Ticket,
  TicketContact,
} from '../../types/index.js';

/** Roughly central London, so the shops sit a believable distance apart. */
export const MOCK_CENTRE = { lat: 51.5072, lng: -0.1276 };

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
  /** Average seconds per customer — what turns a count into a wait. */
  serviceSeconds: number;
  /** True for the one shop signing in puts you in charge of. */
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
    serviceSeconds: 240,
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
    // A bakery counter moves fast, so six people is a short wait.
    serviceSeconds: 70,
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
    // The slowest counter here: appointments run long.
    serviceSeconds: 600,
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
    serviceSeconds: 1500,
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
    serviceSeconds: 420,
  },
  {
    shop: 'Bridge Street Clinic',
    queue: 'Walk-in',
    address: '2 Bridge Street, SW1',
    category: 'health-and-medical',
    description: 'Minor injuries and same-day appointments.',
    lat: 51.5008,
    lng: -0.1246,
    waiting: ['Sana', 'Theo', 'Uma', 'Viktor', 'Wren', 'Xan', 'Yara', 'Zeke', 'Aria'],
    status: 'open',
    plan: 'paid',
    serviceSeconds: 480,
  },
  {
    shop: 'Camden Phone Repair',
    queue: 'Repairs',
    address: '31 Camden High Street, NW1',
    category: 'retail-and-shopping',
    description: 'Screen swaps while you wait.',
    lat: 51.5390,
    lng: -0.1426,
    waiting: ['Brett', 'Cleo'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 900,
  },
  {
    shop: 'Southbank Passport Office',
    queue: 'Applications',
    address: '9 Belvedere Road, SE1',
    category: 'government-and-public-services',
    description: 'Bring both forms of ID.',
    lat: 51.5055,
    lng: -0.1160,
    waiting: ['Dita', 'Emre', 'Fleur', 'Gio', 'Hugo', 'Inga', 'Jonas'],
    status: 'paused',
    plan: 'paid',
    serviceSeconds: 540,
  },
  {
    shop: 'Whitechapel Tyre & MOT',
    queue: 'Service desk',
    address: '120 Whitechapel Road, E1',
    category: 'automotive',
    description: null,
    lat: 51.5175,
    lng: -0.0616,
    waiting: ['Kasia', 'Liam', 'Milo', 'Nour'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 720,
  },
  {
    shop: 'Angel Nails & Spa',
    queue: 'Walk-ins',
    address: '48 Upper Street, N1',
    category: 'personal-care',
    description: 'Walk-ins taken between bookings.',
    lat: 51.5362,
    lng: -0.1033,
    waiting: ['Otis', 'Pearl', 'Quill', 'Rosa', 'Sven'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 1800,
  },
];

/**
 * A geohash good enough for this store's radius search.
 *
 * The real build derives this with `geofire-common` at save time; here the
 * distance filter runs over a handful of seeded queues in memory, so an
 * ordered encoding of the coordinates is all the sort needs.
 */
function mockGeohash(lat: number, lng: number): string {
  const encode = (value: number, span: number) =>
    Math.round(((value + span) / (span * 2)) * 1e5)
      .toString(36)
      .padStart(5, '0');
  return `${encode(lat, 90)}${encode(lng, 180)}`;
}

let seeded = false;

/**
 * Puts ten shops in the store the first time the app runs.
 *
 * Skipped once anything is stored, so a returning visitor keeps the queue
 * they joined and the shop they were serving rather than having it replaced
 * by a fresh copy on every load.
 */
export function seedMockBackend(): void {
  if (seeded || mockStore.restored) return;
  seeded = true;

  for (const entry of SHOPS) {
    const shopId = mockId('shop');
    const queueId = mockId('queue');

    const shop: Shop = {
      name: entry.shop,
      ownerUid: entry.yours ? 'local-owner' : `other-${shopId}`,
      plan: entry.plan,
      exclusiveQueues: false,
    };
    mockStore.set(`shops/${shopId}`, shop as unknown as Record<string, unknown>);

    let lastPosition = 0;
    entry.waiting.forEach((displayName, index) => {
      const position =
        index === 0 ? firstPosition() : nextPosition(lastPosition);
      lastPosition = position;
      const ticketId = mockId('ticket');

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
      mockStore.set(
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
      mockStore.set(
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
      geohash: mockGeohash(entry.lat, entry.lng),
      avgServiceTimeSeconds: entry.serviceSeconds,
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
    mockStore.set(
      `shops/${shopId}/queues/${queueId}`,
      queue as unknown as Record<string, unknown>,
    );

    const station: Station = {
      label: 'Till 1',
      activeStaffUid: entry.yours ? 'local-owner' : `other-${shopId}`,
      currentTicketId: null,
    };
    mockStore.set(
      `shops/${shopId}/queues/${queueId}/stations/${mockId('station')}`,
      station as unknown as Record<string, unknown>,
    );
  }
}
