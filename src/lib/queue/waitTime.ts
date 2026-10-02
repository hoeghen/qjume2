import type { Queue, Station } from '../../types/index.js';

/**
 * The one wait estimate, used by every screen and every notification.
 *
 * It used to be worked out in five places, and they disagreed: the Find list
 * ignored the learned service time, and the queue page divided by every till
 * ever opened, open or not. Someone looking at "1 min" with three people ahead
 * of a fifteen-minute service had good reason to stop trusting the number.
 */

/**
 * Seconds one customer takes: what calls have actually taken here, or the
 * owner's own figure until there is anything to learn from.
 */
export function serviceTimeSeconds(
  queue: Pick<Queue, 'avgServiceTimeSeconds' | 'observedServiceTimeSeconds'>,
): number {
  return queue.observedServiceTimeSeconds ?? queue.avgServiceTimeSeconds;
}

/**
 * Tills serving right now — never fewer than one, since a queue with nobody
 * at the counter is still going to be served by someone.
 *
 * Only a station with `serving` set counts. A till opened once and left
 * idle still exists as a document, and counting it split the wait between
 * people who were not there.
 */
export function staffedTills(
  stations: readonly Pick<Station, 'serving'>[] | null | undefined,
): number {
  const count = stations?.filter((s) => s.serving).length ?? 0;
  return Math.max(1, count);
}

/** Seconds until someone with `peopleAhead` in front of them is called. */
export function estimatedWaitSeconds(
  peopleAhead: number,
  queue: Pick<Queue, 'avgServiceTimeSeconds' | 'observedServiceTimeSeconds'>,
  tills: number,
): number {
  return Math.round(
    (Math.max(0, peopleAhead) * serviceTimeSeconds(queue)) / Math.max(1, tills),
  );
}

/**
 * Wait for someone joining now, from the queue doc alone — for lists that
 * cannot afford to read every queue's tills. `servingStations` is kept on the
 * queue by `startServing`, `stopServing` and the abandoned-queue sweep.
 */
export function joinWaitSeconds(
  queue: Pick<
    Queue,
    | 'waitingCount'
    | 'avgServiceTimeSeconds'
    | 'observedServiceTimeSeconds'
    | 'servingStations'
  >,
): number {
  return estimatedWaitSeconds(
    queue.waitingCount,
    queue,
    queue.servingStations ?? 1,
  );
}
