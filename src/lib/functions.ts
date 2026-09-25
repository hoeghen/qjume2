import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase.js';
import { isMock } from './mock/mode.js';
import { mockApi } from './mock/api.js';
import type {
  NoShowPenalty,
  QueueCategory,
  QueueErrorReason,
  QueueSchedule,
} from '../types/index.js';

/**
 * Typed wrappers for the Cloud Functions. Every queue-state change goes through
 * one of these; there is no client write path to a ticket.
 */
/** What the geocoder made of an address, for the owner to sanity-check. */
export interface Geocoded {
  lat: number;
  lng: number;
  formatted: string;
}

function callable<Req, Res>(name: string) {
  return async (data: Req): Promise<Res> => {
    if (isMock) {
      const handler = (mockApi as Record<string, unknown>)[name];
      if (typeof handler !== 'function') {
        throw new Error(`${name} is not implemented by the mock backend.`);
      }
      return (handler as (d: Req) => Res)(data);
    }
    const fn = httpsCallable<Req, Res>(functions, name);
    return (await fn(data)).data;
  };
}

export const joinQueue = callable<
  {
    shopId: string;
    queueId: string;
    displayName: string;
    email?: string;
    phone?: string;
    /** Scanned the monitor's QR code, so they are in the shop. */
    atCounter?: boolean;
  },
  { ticketId: string; number: number; resumeCode: string }
>('joinQueue');

export const callNext = callable<
  { shopId: string; queueId: string; stationId: string; outcome?: 'served' | 'noShow' },
  {
    ticketId: string | null;
    displayName: string | null;
    resolved: {
      ticketId: string;
      outcome: 'served' | 'noShow';
      removed: boolean;
      noShowCount: number;
    } | null;
  }
>('callNext');

export const leaveQueue = callable<
  { shopId: string; queueId: string; ticketId: string },
  { ok: true }
>('leaveQueue');

export const removeTicket = callable<
  { shopId: string; queueId: string; ticketId: string },
  { ok: true }
>('removeTicket');

export const addWalkIn = callable<
  { shopId: string; queueId: string; displayName: string },
  { ticketId: string; number: number; resumeCode: string }
>('addWalkIn');

export const claimTicket = callable<
  { shopId: string; queueId: string; resumeCode: string },
  { ticketId: string; displayName: string; number: number }
>('claimTicket');

export const registerPushToken = callable<
  { shopId: string; queueId: string; ticketId: string; token: string },
  { ok: true }
>('registerPushToken');

export const relinkTicket = callable<
  { shopId: string; queueId: string; ticketId: string },
  { resumeCode: string; displayName: string }
>('relinkTicket');

export const startCheckout = callable<
  { shopId: string; plan: 'free' | 'paid' },
  { url: string }
>('startCheckout');

export const completeCheckout = callable<
  { sessionId: string },
  { plan: 'free' | 'paid' }
>('completeCheckout');

export const addStaff = callable<
  { shopId: string; email: string },
  { uid: string }
>('addStaff');

export const removeStaff = callable<
  { shopId: string; uid: string },
  { ok: true }
>('removeStaff');

export const createQueue = callable<
  {
    shopId: string;
    name: string;
    address: string;
    category: QueueCategory;
    maxSize: number;
    avgServiceTimeSeconds: number;
    noShowPenalty: NoShowPenalty;
    schedule?: QueueSchedule | null;
    description?: string | null;
  },
  { queueId: string; geocoded: Geocoded | null }
>('createQueue');

export const updateQueue = callable<
  {
    shopId: string;
    queueId: string;
    name: string;
    address: string;
    category: QueueCategory;
    maxSize: number;
    avgServiceTimeSeconds: number;
    noShowPenalty: NoShowPenalty;
    schedule?: QueueSchedule | null;
    description?: string | null;
  },
  { geocoded: Geocoded | null }
>('updateQueue');

export const suggestAddresses = callable<
  { query: string },
  { suggestions: { formatted: string; lat: number; lng: number }[] }
>('suggestAddresses');

export const claimStation = callable<
  { shopId: string; queueId: string; stationId?: string; label?: string },
  { stationId: string; label: string }
>('claimStation');

export const closeQueue = callable<
  { shopId: string; queueId: string; mode: 'drain' | 'hard' },
  { clearedCount: number }
>('closeQueue');

/**
 * Platform admin. Every one of these requires the `platformAdmin` custom
 * claim server-side — see CLAUDE.md decision 9 — not anything checked here.
 */
export const suspendShop = callable<
  { shopId: string },
  { suspended: boolean }
>('suspendShop');

export const reinstateShop = callable<
  { shopId: string },
  { suspended: boolean }
>('reinstateShop');

export const adminUpdateShop = callable<
  {
    shopId: string;
    name: string;
    exclusiveQueues: boolean;
    profile?: { logo: string | null; hours: string | null; phone: string | null; description: string | null } | null;
  },
  void
>('adminUpdateShop');

export const adminUpdateQueue = callable<
  {
    shopId: string;
    queueId: string;
    name: string;
    address: string;
    category: QueueCategory;
    maxSize: number;
    avgServiceTimeSeconds: number;
    noShowPenalty: NoShowPenalty;
    schedule?: QueueSchedule | null;
    description?: string | null;
  },
  { geocoded: Geocoded | null }
>('adminUpdateQueue');

export const adminDeleteShop = callable<{ shopId: string }, void>(
  'adminDeleteShop',
);

/** The machine-readable reason a call was refused, when there is one. */
export function reasonOf(error: unknown): QueueErrorReason | null {
  const details = (error as { details?: { reason?: QueueErrorReason } })?.details;
  return details?.reason ?? null;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
