import { describe, expect, it } from 'vitest';
import { placesToMoveBack } from './penalties.js';

describe('no-show penalties', () => {
  it('maps each configured penalty to a number of places', () => {
    expect(placesToMoveBack('back3')).toBe(3);
    expect(placesToMoveBack('back5')).toBe(5);
  });

  it('sends `back` behind everyone waiting, however many that is', () => {
    expect(placesToMoveBack('back')).toBe(Number.POSITIVE_INFINITY);
  });
});
