import { describe, expect, it } from 'vitest';
import { generateResumeCode, hashResumeCode } from './resumeCode.js';

describe('generateResumeCode', () => {
  it('draws one letter-digit pair, never an ambiguous letter', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateResumeCode()).toMatch(/^[A-HJKMNP-TV-Z][0-9]$/);
    }
  });
});

describe('hashResumeCode', () => {
  it('scopes the same code to different hashes per queue', () => {
    expect(hashResumeCode('queue-a', 'K3')).not.toBe(
      hashResumeCode('queue-b', 'K3'),
    );
  });

  it('is case-insensitive on the code', () => {
    expect(hashResumeCode('queue-a', 'k3')).toBe(
      hashResumeCode('queue-a', 'K3'),
    );
  });
});
