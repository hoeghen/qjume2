import { mockStore, mockId } from './store.js';
import { firstPosition, nextPosition } from '../queue/positions.js';
import type {
  Queue,
  Shop,
  Station,
  Ticket,
  TicketContact,
} from '../../types/index.js';

/**
 * Where the shops sit until someone's real position is known.
 *
 * Only a starting point. The shops are defined as offsets and moved to
 * whoever opens the app — hardcoded coordinates would mean an empty list for
 * everyone outside one city, which is exactly what happened.
 */
export const MOCK_CENTRE = { lat: 51.5072, lng: -0.1276 };

interface SeedShop {
  shop: string;
  queue: string;
  address: string;
  category: Queue['category'];
  description: string | null;
  /** Kilometres north (+) and east (+) of whoever is looking. */
  north: number;
  east: number;
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
    address: '1 River Lane',
    category: 'health-and-medical',
    description: 'Walk-in flu jab clinic, no appointment needed.',
    north: -0.3,
    east: 0.4,
    waiting: ['Ana', 'Bilal', 'Chen'],
    status: 'open',
    plan: 'paid',
    serviceSeconds: 240,
    // Signing in lands on this one, mid-service, so the shop side has
    // something to do from the first tap.
    yours: true,
  },
  {
    shop: 'Corner Deli',
    queue: 'Counter',
    address: '14 Mill Road',
    category: 'food-and-drink',
    description: null,
    north: 0.5,
    east: -0.2,
    waiting: ['Dara', 'Eve', 'Femi', 'Gus', 'Hana', 'Ivo'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 70,
  },
  {
    shop: 'Town Hall',
    queue: 'Registrations',
    address: '2 Civic Square',
    category: 'government-and-public-services',
    description: 'Birth, death and marriage certificates.',
    north: 1.1,
    east: 0.3,
    waiting: ['Jo', 'Kit', 'Lena', 'Mo', 'Nia', 'Omar', 'Pia', 'Quinn'],
    status: 'open',
    plan: 'paid',
    serviceSeconds: 600,
  },
  {
    shop: 'Northside Barbers',
    queue: 'Cuts',
    address: '77 High Street',
    category: 'personal-care',
    description: null,
    north: 1.6,
    east: -0.9,
    waiting: ['Rae'],
    status: 'drainMode',
    plan: 'free',
    serviceSeconds: 1500,
  },
  {
    shop: 'Quay Parade Bank',
    queue: 'Enquiries',
    address: '5 Quay Parade',
    category: 'banking-and-finance',
    description: null,
    north: 0.8,
    east: 2.4,
    waiting: [],
    status: 'closed',
    plan: 'free',
    serviceSeconds: 420,
  },
  {
    shop: 'Bridge Street Clinic',
    queue: 'Walk-in',
    address: '2 Bridge Street',
    category: 'health-and-medical',
    description: 'Minor injuries and same-day appointments.',
    north: -0.7,
    east: 0.2,
    waiting: ['Sana', 'Theo', 'Uma', 'Viktor', 'Wren', 'Xan', 'Yara', 'Zeke', 'Aria'],
    status: 'open',
    plan: 'paid',
    serviceSeconds: 480,
  },
  {
    shop: 'Camden Phone Repair',
    queue: 'Repairs',
    address: '31 Camden High Street',
    category: 'retail-and-shopping',
    description: 'Screen swaps while you wait.',
    north: 2.2,
    east: -1.1,
    waiting: ['Brett', 'Cleo'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 900,
  },
  {
    shop: 'Passport Office',
    queue: 'Applications',
    address: '9 Belvedere Road',
    category: 'government-and-public-services',
    description: 'Bring both forms of ID.',
    north: -0.2,
    east: 0.9,
    waiting: ['Dita', 'Emre', 'Fleur', 'Gio', 'Hugo', 'Inga', 'Jonas'],
    status: 'paused',
    plan: 'paid',
    serviceSeconds: 540,
  },
  {
    shop: 'Whitechapel Tyre & MOT',
    queue: 'Service desk',
    address: '120 Church Road',
    category: 'automotive',
    description: null,
    north: 1.0,
    east: 3.1,
    waiting: ['Kasia', 'Liam', 'Milo', 'Nour'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 720,
  },
  {
    shop: 'Angel Nails & Spa',
    queue: 'Walk-ins',
    address: '48 Upper Street',
    category: 'personal-care',
    description: 'Walk-ins taken between bookings.',
    north: 1.9,
    east: 0.6,
    waiting: ['Otis', 'Pearl', 'Quill', 'Rosa', 'Sven'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 1800,
  },
  {
    shop: 'Harbour Post Office',
    queue: 'Parcels',
    address: '3 Harbour Way',
    category: 'government-and-public-services',
    description: null,
    north: -1.4,
    east: 1.2,
    waiting: ['Tess', 'Umar', 'Vera'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 300,
  },
  {
    shop: 'Greenfield Vets',
    queue: 'Consultations',
    address: '61 Greenfield Lane',
    category: 'health-and-medical',
    description: 'Emergencies seen same day.',
    north: 2.8,
    east: -2.0,
    waiting: ['Wade', 'Xenia'],
    status: 'open',
    plan: 'paid',
    serviceSeconds: 900,
  },
  {
    shop: 'Station Coffee',
    queue: 'Takeaway',
    address: '1 Station Approach',
    category: 'food-and-drink',
    description: null,
    north: -0.9,
    east: -0.5,
    waiting: ['Yusuf', 'Zara', 'Abe', 'Bea', 'Cai', 'Dot', 'Eli'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 55,
  },
  {
    shop: 'Central Library',
    queue: 'Help desk',
    address: '12 Library Square',
    category: 'education',
    description: 'Printing, scanning and card renewals.',
    north: 0.6,
    east: -1.7,
    waiting: ['Fern'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 360,
  },
  {
    shop: 'Lakeside Opticians',
    queue: 'Eye tests',
    address: '24 Lakeside Parade',
    category: 'health-and-medical',
    description: null,
    north: -2.3,
    east: 0.8,
    waiting: ['Gil', 'Hope', 'Ida', 'Jem'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 1200,
  },
  {
    shop: 'Metro Tyres',
    queue: 'Fitting bay',
    address: '88 Trade Park',
    category: 'automotive',
    description: 'Four-wheel alignment while you wait.',
    north: 3.4,
    east: 2.2,
    waiting: ['Kian', 'Lux'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 1500,
  },
  {
    shop: 'Old Mill Bakery',
    queue: 'Bread counter',
    address: '7 Old Mill Yard',
    category: 'food-and-drink',
    description: null,
    north: 4.1,
    east: -0.7,
    waiting: ['Mina', 'Noor', 'Ozzy'],
    status: 'drainMode',
    plan: 'free',
    serviceSeconds: 80,
  },
  {
    shop: 'Riverbank Dentist',
    queue: 'Check-ups',
    address: '40 Riverbank Road',
    category: 'health-and-medical',
    description: null,
    north: -3.2,
    east: -1.4,
    waiting: ['Pim', 'Quinn', 'Ravi', 'Suki', 'Tom'],
    status: 'open',
    plan: 'paid',
    serviceSeconds: 1080,
  },
  {
    shop: 'Grand Theatre',
    queue: 'Box office',
    address: '2 Theatre Row',
    category: 'events-and-attractions',
    description: 'Same-day returns from one hour before curtain.',
    north: 1.3,
    east: 1.9,
    waiting: ['Uma', 'Vik', 'Wil', 'Xia', 'Yan', 'Zoe', 'Ash', 'Bo'],
    status: 'open',
    plan: 'paid',
    serviceSeconds: 180,
  },
  {
    shop: 'Airport Transfers',
    queue: 'Bookings',
    address: 'Terminal 1, Arrivals',
    category: 'transport-and-travel',
    description: null,
    north: 6.8,
    east: 5.4,
    waiting: ['Cass', 'Dov'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 240,
  },
  {
    shop: 'Seaside Pharmacy',
    queue: 'Prescriptions',
    address: '8 Marine Parade',
    category: 'health-and-medical',
    description: null,
    north: -1.8,
    east: 2.7,
    waiting: ['Eira', 'Finn'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 210,
  },
  {
    shop: 'Union Street Bank',
    queue: 'Cashiers',
    address: '15 Union Street',
    category: 'banking-and-finance',
    description: 'Paying in and foreign currency.',
    north: 0.9,
    east: -2.6,
    waiting: ['Gwen', 'Hari', 'Ines', 'Jarl'],
    status: 'open',
    plan: 'paid',
    serviceSeconds: 400,
  },
  {
    shop: 'Parkside Butcher',
    queue: 'Service counter',
    address: '3 Park Row',
    category: 'food-and-drink',
    description: null,
    north: 2.4,
    east: 1.4,
    waiting: ['Kris', 'Lotta', 'Mads'],
    status: 'open',
    plan: 'free',
    serviceSeconds: 120,
  },
  {
    shop: 'City Driving Test Centre',
    queue: 'Practical tests',
    address: '50 Airport Way',
    category: 'transport-and-travel',
    description: 'Arrive fifteen minutes before your slot.',
    north: 5.2,
    east: -3.3,
    waiting: ['Nils', 'Oda'],
    status: 'drainMode',
    plan: 'paid',
    serviceSeconds: 2400,
  },
  {
    shop: 'Hillside Physio',
    queue: 'Walk-in clinic',
    address: '22 Hillside Road',
    category: 'health-and-medical',
    description: null,
    north: 3.9,
    east: 3.8,
    waiting: ['Pelle', 'Rikke', 'Sofie'],
    // Heartbeat dropped: still open, taking no new joiners. See CLAUDE.md 4.
    status: 'unavailable',
    plan: 'free',
    serviceSeconds: 900,
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

/** Where the offsets are currently resolved against, and by which queue. */
interface Placement {
  origin: { lat: number; lng: number };
  /** Queue document path -> its offset, so only seeded shops ever move. */
  offsets: Record<string, { north: number; east: number }>;
}

const PLACEMENT_PATH = 'mock/placement';
const KM_PER_DEGREE = 111.32;

function coordsFor(
  origin: { lat: number; lng: number },
  north: number,
  east: number,
): { lat: number; lng: number } {
  const lat = origin.lat + north / KM_PER_DEGREE;
  // Degrees of longitude shrink towards the poles, so the east offset is
  // scaled by the latitude or the shops bunch up in Oslo and spread in Lagos.
  const lngScale = Math.max(0.1, Math.cos((origin.lat * Math.PI) / 180));
  return { lat, lng: origin.lng + east / (KM_PER_DEGREE * lngScale) };
}

/**
 * Moves the seeded shops to whoever is looking.
 *
 * The shops are invented, so the only sensible place for them is around the
 * person opening the app. Fixed coordinates meant an empty list for everyone
 * outside one city — which is what "I see no shops" was.
 *
 * Only queues listed in the placement move: a queue someone created stays
 * where they put it.
 */
export function placeMockShopsNear(centre: { lat: number; lng: number }): void {
  const placement = mockStore.get<Placement>(PLACEMENT_PATH);
  if (!placement) return;

  // A few hundred metres is not worth rewriting every queue for.
  const moved =
    Math.abs(placement.origin.lat - centre.lat) > 0.005 ||
    Math.abs(placement.origin.lng - centre.lng) > 0.005;
  if (!moved) return;

  for (const [path, offset] of Object.entries(placement.offsets)) {
    const queue = mockStore.get<Queue>(path);
    if (!queue) continue;
    const { lat, lng } = coordsFor(centre, offset.north, offset.east);
    mockStore.update(path, { lat, lng, geohash: mockGeohash(lat, lng) });
  }

  mockStore.set(PLACEMENT_PATH, {
    ...placement,
    origin: { lat: centre.lat, lng: centre.lng },
  } as unknown as Record<string, unknown>);
}

let seeded = false;

/**
 * Puts twenty-five shops in the store the first time the app runs.
 *
 * Twenty-two are open or closing, so the default list — which hides shut
 * queues — has a full twenty to show. The other three are closed, paused and
 * offline, and exist so the status filter and its badges have something real
 * to reveal.
 *
 * Skipped once anything is stored, so a returning visitor keeps the queue
 * they joined and the shop they were serving rather than having it replaced
 * by a fresh copy on every load.
 */
export function seedMockBackend(): void {
  if (seeded || mockStore.restored) return;
  seeded = true;

  const offsets: Placement['offsets'] = {};

  for (const entry of SHOPS) {
    const shopId = mockId('shop');
    const queueId = mockId('queue');
    const { lat, lng } = coordsFor(MOCK_CENTRE, entry.north, entry.east);

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
      lat,
      lng,
      geohash: mockGeohash(lat, lng),
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
    offsets[`shops/${shopId}/queues/${queueId}`] = {
      north: entry.north,
      east: entry.east,
    };

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

  mockStore.set(PLACEMENT_PATH, {
    origin: MOCK_CENTRE,
    offsets,
  } as unknown as Record<string, unknown>);
}
