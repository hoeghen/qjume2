import { describe, expect, it } from 'vitest';
import {
  NO_SHOW_REMOVAL_THRESHOLD,
  QUEUE_CATEGORIES,
} from '../../src/types/index.js';

/**
 * The app and the functions must not drift: both import the Firestore document
 * types from `src/types/`. This asserts the cross-workspace import actually
 * resolves from inside `functions/`, so Phase 1 does not discover a broken
 * build path while writing `callNext`.
 */
describe('shared types', () => {
  it('are importable from the functions workspace', () => {
    expect(NO_SHOW_REMOVAL_THRESHOLD).toBe(3);
  });

  it('define the eleven fixed queue categories', () => {
    expect(QUEUE_CATEGORIES).toHaveLength(11);
  });
});
