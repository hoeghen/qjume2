import type { NoShowPenalty } from '../../../src/types/index.js';

/**
 * How many waiting customers overtake a no-show, by the queue's configured
 * penalty. `back` sends them behind everyone currently waiting. See PRD 5.4.
 */
export function placesToMoveBack(penalty: NoShowPenalty): number {
  switch (penalty) {
    case 'back':
      return Number.POSITIVE_INFINITY;
    case 'back3':
      return 3;
    case 'back5':
      return 5;
  }
}
