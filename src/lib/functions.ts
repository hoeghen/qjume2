import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase.js';
import { track } from './activity.js';
import type { Locale } from './i18n/locale.js';
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
  return (data: Req): Promise<Res> => {
    const fn = httpsCallable<Req, Res>(functions, name);
    // Spinner on whichever button started this (src/lib/activity.ts).
    return track(fn(data).then((r) => r.data));
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
    /** The language they joined in; notifications are written in it. */
    locale?: Locale;
  },
  { ticketId: string; number: number; resumeCode: string }
>('joinQueue');

export const callNext = callable<
  {
    shopId: string;
    queueId: string;
    stationId: string;
    outcome?: 'served' | 'noShow';
    /** Finish the current customer without calling the next one. */
    finishOnly?: boolean;
  },
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

export const startTransfer = callable<
  { shopId: string; queueId: string; ticketId: string; token: string },
  { expiresAt: number }
>('startTransfer');

export const claimTransfer = callable<
  { shopId: string; queueId: string; ticketId: string; token: string },
  { ticketId: string; displayName: string }
>('claimTransfer');

export const registerPushToken = callable<
  { shopId: string; queueId: string; ticketId: string; token: string; locale?: Locale },
  { ok: true }
>('registerPushToken');

export const unregisterPushToken = callable<
  { shopId: string; queueId: string; ticketId: string; token: string },
  { ok: true }
>('unregisterPushToken');

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
  { shopId: string; email: string; name?: string },
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

export const reverseGeocode = callable<
  { lat: number; lng: number },
  { formatted: string }
>('reverseGeocode');

export const claimStation = callable<
  { shopId: string; queueId: string; stationId?: string; label?: string; deviceId?: string },
  { stationId: string; label: string }
>('claimStation');

export const deleteStation = callable<
  { shopId: string; queueId: string; stationId: string; deviceId?: string; force?: boolean },
  void
>('deleteStation');

export const releaseStation = callable<
  { shopId: string; queueId: string; stationId: string; deviceId: string },
  void
>('releaseStation');

export const startServing = callable<
  { shopId: string; queueId: string; stationId: string },
  void
>('startServing');

export const stopServing = callable<
  { shopId: string; queueId: string; stationId: string },
  void
>('stopServing');

export const resetServiceTime = callable<
  { shopId: string; queueId: string },
  void
>('resetServiceTime');

export const closeQueue = callable<
  { shopId: string; queueId: string; mode: 'drain' | 'hard' },
  { clearedCount: number }
>('closeQueue');

export const deleteQueue = callable<
  { shopId: string; queueId: string },
  void
>('deleteQueue');

export const deleteShop = callable<{ shopId: string }, void>('deleteShop');

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

export const renameShop = callable<
  { shopId: string; name: string },
  { name: string }
>('renameShop');

export const adminUpdateShop = callable<
  {
    shopId: string;
    name: string;
    exclusiveQueues: boolean;
    profile?: { logo: string | null; hours: string | null; phone: string | null; description: string | null } | null;
  },
  void
>('adminUpdateShop');

export const adminGrantFreeServices = callable<
  { shopId: string; amount: number },
  { freeServicesGranted: number }
>('adminGrantFreeServices');

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

export const adminDeleteQueue = callable<
  { shopId: string; queueId: string },
  void
>('adminDeleteQueue');

/** The machine-readable reason a call was refused, when there is one. */
export function reasonOf(error: unknown): QueueErrorReason | null {
  const details = (error as { details?: { reason?: QueueErrorReason } })?.details;
  return details?.reason ?? null;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
