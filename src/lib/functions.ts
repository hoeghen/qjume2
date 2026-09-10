import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase.js';
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
function callable<Req, Res>(name: string) {
  const fn = httpsCallable<Req, Res>(functions, name);
  return async (data: Req): Promise<Res> => (await fn(data)).data;
}

export const joinQueue = callable<
  { shopId: string; queueId: string; displayName: string; email?: string; phone?: string },
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

export const relinkTicket = callable<
  { shopId: string; queueId: string; ticketId: string },
  { resumeCode: string; displayName: string }
>('relinkTicket');

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
  { queueId: string }
>('createQueue');

export const claimStation = callable<
  { shopId: string; queueId: string; stationId?: string; label?: string },
  { stationId: string; label: string }
>('claimStation');

export const closeQueue = callable<
  { shopId: string; queueId: string; mode: 'drain' | 'hard' },
  { clearedCount: number }
>('closeQueue');

/** The machine-readable reason a call was refused, when there is one. */
export function reasonOf(error: unknown): QueueErrorReason | null {
  const details = (error as { details?: { reason?: QueueErrorReason } })?.details;
  return details?.reason ?? null;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
