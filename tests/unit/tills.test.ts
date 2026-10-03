import { describe, expect, it } from 'vitest';
import { tillLabel } from '../../src/lib/tills.js';

describe('till names', () => {
  it('words an automatic name in the reader’s language', () => {
    expect(tillLabel('Till 2', 'da')).toBe('Kasse 2');
    expect(tillLabel('Kasse 2', 'en')).toBe('Till 2');
    expect(tillLabel('Station 3', 'da')).toBe('Kasse 3');
  });

  it('shows a name the shop chose exactly as typed', () => {
    expect(tillLabel('Skranke', 'en')).toBe('Skranke');
    expect(tillLabel('Till for returns', 'da')).toBe('Till for returns');
  });
});
