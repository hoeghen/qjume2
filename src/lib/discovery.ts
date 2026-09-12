import {
  collectionGroup,
  endAt,
  getDocs,
  orderBy,
  query,
  startAt,
} from 'firebase/firestore';
import { distanceBetween, geohashQueryBounds } from 'geofire-common';
import { db } from './firebase.js';
import { queueConverter } from './firestore/converters.js';
import type { Queue, QueueCategory, QueueStatus } from '../types/index.js';

export interface DiscoveredQueue extends Queue {
  id: string;
  shopId: string;
  /** Kilometres from the customer. */
  distanceKm: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export type SortKey = 'distance' | 'name' | 'wait';

export interface Filters {
  radiusKm: number;
  category: QueueCategory | 'all';
  status: 'all' | 'active' | 'inactive';
  search: string;
  sort: SortKey;
}

/**
 * Queues within `radiusKm` of a point.
 *
 * Firestore has no radius query, so this uses the documented geohash approach
 * (PRD 9.3): `geohashQueryBounds` returns up to nine prefix ranges covering the
 * circle, each range is one query, and the merged results are then filtered by
 * true distance to drop the corners the ranges over-select.
 *
 * Only the geohash range is pushed to the server. Category, status and text
 * filtering all happen over the returned set, which is already bounded by the
 * radius — that avoids a composite index per filter combination, at the cost of
 * not scaling to a radius containing tens of thousands of queues.
 */
export async function findQueuesNear(
  center: Coordinates,
  radiusKm: number,
): Promise<DiscoveredQueue[]> {
  const radiusM = radiusKm * 1000;
  const bounds = geohashQueryBounds([center.lat, center.lng], radiusM);

  const snapshots = await Promise.all(
    bounds.map((bound) =>
      getDocs(
        query(
          collectionGroup(db, 'queues').withConverter(queueConverter),
          orderBy('geohash'),
          startAt(bound[0]),
          endAt(bound[1]),
        ),
      ),
    ),
  );

  const found = new Map<string, DiscoveredQueue>();

  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      const queue = doc.data();
      // A queue whose address could not be placed has no coordinates and
      // cannot be offered by distance.
      if (queue.lat === null || queue.lng === null) continue;

      const distanceKm = distanceBetween(
        [queue.lat, queue.lng],
        [center.lat, center.lng],
      );
      // Geohash ranges over-select at the edges; this is the real filter.
      if (distanceKm > radiusKm) continue;

      const shopId = doc.ref.parent.parent?.id;
      if (!shopId) continue;

      found.set(doc.ref.path, { ...queue, id: doc.id, shopId, distanceKm });
    }
  }

  return [...found.values()];
}

/** Statuses a customer would call "open for business". */
const ACTIVE: QueueStatus[] = ['open', 'drainMode'];

function matchesSearch(queue: DiscoveredQueue, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  // PRD 4.1: shop name, address, queue name and description.
  return [queue.shopName, queue.address, queue.name, queue.description ?? '']
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

export function applyFilters(
  queues: DiscoveredQueue[],
  filters: Filters,
): DiscoveredQueue[] {
  const filtered = queues.filter((q) => {
    if (filters.category !== 'all' && q.category !== filters.category) {
      return false;
    }
    if (filters.status === 'active' && !ACTIVE.includes(q.status)) return false;
    if (filters.status === 'inactive' && ACTIVE.includes(q.status)) return false;
    return matchesSearch(q, filters.search);
  });

  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case 'name':
        return a.shopName.localeCompare(b.shopName);
      case 'wait':
        return estimatedWaitSeconds(a) - estimatedWaitSeconds(b);
      case 'distance':
      default:
        return a.distanceKm - b.distanceKm;
    }
  });
}

/**
 * Rough wait for someone joining now: everyone ahead, at the queue's current
 * average service time. Phase 4 refines the average from observed service
 * times and divides by the number of active stations (PRD 9.5).
 */
export function estimatedWaitSeconds(
  queue: Pick<Queue, 'waitingCount' | 'avgServiceTimeSeconds'>,
  activeStations = 1,
): number {
  const stations = Math.max(1, activeStations);
  return Math.round((queue.waitingCount * queue.avgServiceTimeSeconds) / stations);
}
