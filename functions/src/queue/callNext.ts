import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import {
  FieldValue,
  type Firestore,
  type QueryDocumentSnapshot,
  type Transaction,
} from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { placesToMoveBack } from './penalties.js';
import { foldSample, isUsableSample } from './serviceTime.js';
import {
  positionAtBack,
  positionBetween,
  reindexedPositions,
} from './positions.js';
import {
  NO_SHOW_REMOVAL_THRESHOLD,
  type Queue,
  type Shop,
  type Station,
  type Ticket,
} from '../../../src/types/index.js';

/** What happened to the customer currently being served at this station. */
export type CurrentOutcome = 'served' | 'noShow';

export interface CallNextRequest {
  shopId: string;
  queueId: string;
  stationId: string;
  /** Defaults to `served`. */
  outcome?: CurrentOutcome;
}

export interface CallNextResult {
  /** The ticket now being served, or null when nobody was waiting. */
  ticketId: string | null;
  displayName: string | null;
  /** How the previous ticket was resolved, if there was one. */
  resolved: {
    ticketId: string;
    outcome: CurrentOutcome;
    /** Set on a no-show: whether the third strike removed them outright. */
    removed: boolean;
    noShowCount: number;
  } | null;
}

/** Enough of the head of the queue to apply the widest penalty and still call someone. */
const HEAD_LIMIT = 10;

interface WaitingTicket {
  id: string;
  position: number;
  number: number;
  displayName: string;
}

function toWaiting(doc: QueryDocumentSnapshot): WaitingTicket {
  const data = doc.data() as Ticket;
  return {
    id: doc.id,
    position: data.position,
    number: data.number,
    displayName: data.displayName,
  };
}

/**
 * Resolve the ticket currently at this station and assign the next waiting one.
 *
 * The whole read-modify-write runs in a single Firestore transaction, so two
 * staff tapping Next simultaneously get two different customers: both
 * transactions read the same candidate ticket, the first to commit wins, and
 * the second re-reads and takes the following one. There is deliberately no
 * client-side debounce or artificial delay anywhere near this — if one seemed
 * necessary, the transaction would be wrong. See CLAUDE.md invariant 2.
 *
 * Separated from the callable wrapper so tests can drive the transaction
 * directly, including running two of them at once.
 */
export async function performCallNext(
  firestore: Firestore,
  callerUid: string,
  input: CallNextRequest,
): Promise<CallNextResult> {
  const { shopId, queueId, stationId, outcome = 'served' } = input;

  if (!shopId || !queueId || !stationId) {
    throw fail(
      'invalid-argument',
      'queue-not-found',
      'shopId, queueId and stationId are required.',
    );
  }

  const shopRef = firestore.doc(`shops/${shopId}`);
  const queueRef = firestore.doc(`shops/${shopId}/queues/${queueId}`);
  const stationRef = queueRef.collection('stations').doc(stationId);
  const ticketsRef = queueRef.collection('tickets');
  const waitingQuery = ticketsRef.where('state', '==', 'waiting');

  return firestore.runTransaction(async (tx: Transaction) => {
    // ================= reads =================
    // Firestore requires every read to precede every write in a transaction,
    // so all branching data is gathered up front.
    const [shopSnap, queueSnap, stationSnap] = await Promise.all([
      tx.get(shopRef),
      tx.get(queueRef),
      tx.get(stationRef),
    ]);

    const shop = shopSnap.data() as Shop | undefined;
    if (!shop) throw fail('not-found', 'shop-not-found', 'Shop not found.');
    if (shop.ownerUid !== callerUid) {
      throw fail(
        'permission-denied',
        'not-shop-owner',
        'Only the shop owner can serve this queue.',
      );
    }

    const queue = queueSnap.data() as Queue | undefined;
    if (!queue) throw fail('not-found', 'queue-not-found', 'Queue not found.');

    const station = stationSnap.data() as Station | undefined;
    if (!station) {
      throw fail('not-found', 'station-not-found', 'Station not found.');
    }

    const currentSnap = station.currentTicketId
      ? await tx.get(ticketsRef.doc(station.currentTicketId))
      : null;
    const current =
      currentSnap?.exists === true ? (currentSnap.data() as Ticket) : null;

    const head = (
      await tx.get(waitingQuery.orderBy('position').limit(HEAD_LIMIT))
    ).docs.map(toWaiting);

    const isPenalty =
      current !== null &&
      outcome === 'noShow' &&
      current.noShowCount + 1 < NO_SHOW_REMOVAL_THRESHOLD;

    const places = isPenalty ? placesToMoveBack(queue.noShowPenalty) : 0;

    const placement =
      isPenalty && current
        ? placeAfter(head, places, current.position, queue.lastPosition)
        : null;

    // Splitting the interval can fail only at double precision, which needs
    // roughly sixty penalties landing between the same two neighbours. Rare,
    // but it must not emit a duplicate position, so fall back to a reindex.
    const fullWaiting =
      placement?.kind === 'reindex'
        ? (await tx.get(waitingQuery.orderBy('position'))).docs.map(toWaiting)
        : [];

    // ================= writes =================
    let resolved: CallNextResult['resolved'] = null;
    let penalisedId: string | null = null;
    let penalisedPosition: number | null = null;
    let observed: { averageSeconds: number; sampleCount: number } | null = null;

    if (current !== null && currentSnap !== null) {
      const currentId = currentSnap.id;

      if (outcome === 'served') {
        tx.update(currentSnap.ref, { state: 'served', station: null });
        resolved = {
          ticketId: currentId,
          outcome: 'served',
          removed: false,
          noShowCount: current.noShowCount,
        };

        // How long this customer actually took, folded into the queue's
        // average. Only completions count — a no-show resolves in seconds and
        // would drag the estimate down for everyone behind them (PRD 9.5).
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
        // Three strikes removes the ticket outright, per ticket per queue.
        const removed = noShowCount >= NO_SHOW_REMOVAL_THRESHOLD;

        if (removed) {
          tx.update(currentSnap.ref, {
            state: 'removed',
            noShowCount,
            station: null,
          });
        } else {
          penalisedId = currentId;
          let position: number;

          if (placement?.kind === 'reindex') {
            const positions = reindexedPositions(fullWaiting.length);
            fullWaiting.forEach((t, i) => {
              tx.update(ticketsRef.doc(t.id), {
                position: positions[i] as number,
              });
            });
            position = placeInReindexed(positions, places);
          } else {
            position = placement?.position ?? current.position;
          }

          penalisedPosition = position;
          tx.update(currentSnap.ref, {
            state: 'waiting',
            noShowCount,
            station: null,
            position,
          });
        }

        resolved = {
          ticketId: currentId,
          outcome: 'noShow',
          removed,
          noShowCount,
        };
      }
    }

    // A ticket just sent back must not be handed straight back to the same
    // station, even when it is still the lowest waiting position.
    const next =
      (placement?.kind === 'reindex' ? fullWaiting : head).find(
        (t) => t.id !== penalisedId,
      ) ?? null;

    if (next) {
      tx.update(ticketsRef.doc(next.id), {
        state: 'serving',
        station: stationId,
        calledAt: Date.now(),
      });
    }

    tx.update(stationRef, { currentTicketId: next?.id ?? null });

    // waitingCount is denormalised onto the queue for list and map views: the
    // called ticket leaves the waiting set, a penalised one rejoins it.
    const waitingDelta = (next ? -1 : 0) + (penalisedId !== null ? 1 : 0);
    const queueUpdate: Record<string, unknown> = {
      // Observed service times feed the wait estimate (PRD 9.5). Writing it on
      // every call also serialises concurrent taps on the same queue.
      lastServedAt: Date.now(),
    };
    if (penalisedPosition !== null && penalisedPosition > queue.lastPosition) {
      queueUpdate['lastPosition'] = penalisedPosition;
    }
    if (waitingDelta !== 0) {
      queueUpdate['waitingCount'] = FieldValue.increment(waitingDelta);
    }
    if (next) queueUpdate['currentNumber'] = next.number;
    if (observed) {
      queueUpdate['observedServiceTimeSeconds'] = observed.averageSeconds;
      queueUpdate['servedSampleCount'] = observed.sampleCount;
    }
    tx.update(queueRef, queueUpdate);

    return {
      ticketId: next?.id ?? null,
      displayName: next?.displayName ?? null,
      resolved,
    };
  });
}

export const callNext = onCall<CallNextRequest, Promise<CallNextResult>>(
  (request: CallableRequest<CallNextRequest>) =>
    performCallNext(db, requireCaller(request).uid, request.data),
);

type Placement =
  | { kind: 'at'; position: number }
  | { kind: 'reindex'; position?: undefined };

/**
 * Where a penalised ticket lands: behind `places` of those waiting, or behind
 * everyone when the queue is shorter than the penalty. With nobody else
 * waiting the penalty has no one to move them behind, so they keep their place.
 */
function placeAfter(
  head: WaitingTicket[],
  places: number,
  currentPosition: number,
  lastPosition: number,
): Placement {
  if (head.length === 0) return { kind: 'at', position: currentPosition };

  // Behind everyone waiting, taken from the queue's monotonic counter rather
  // than the head, which may not reach the back of a long queue.
  if (places >= head.length) {
    return { kind: 'at', position: positionAtBack(lastPosition) };
  }

  const before = (head[places - 1] as WaitingTicket).position;
  const after = (head[places] as WaitingTicket).position;
  const mid = positionBetween(before, after);
  return mid === null ? { kind: 'reindex' } : { kind: 'at', position: mid };
}

/** Slot the penalised ticket into a freshly reindexed waiting list. */
function placeInReindexed(positions: number[], places: number): number {
  if (positions.length === 0) return reindexedPositions(1)[0] as number;
  const idx = Math.min(places, positions.length) - 1;
  const before = positions[idx] as number;
  const after = positions[idx + 1];
  return after === undefined
    ? positionAtBack(before)
    : (positionBetween(before, after) as number);
}
