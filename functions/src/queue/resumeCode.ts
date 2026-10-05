import { createHash, randomInt } from 'node:crypto';

/**
 * No I, L, O or U, so a code read aloud over a counter cannot be
 * transcribed ambiguously.
 */
const LETTERS = 'ABCDEFGHJKMNPQRSTVWXYZ';
const DIGITS = '0123456789';
const PAIR_COUNT = 1;

/**
 * PRD 12.3 proposes six alphanumeric characters, scoped per queue; shortened
 * to one letter-digit pair (e.g. K3) on request, for maximum memorability.
 *
 * This is a deliberate, known trade-off, not an oversight: one pair is only
 * 22 × 10 = 220 possible codes, and `claimTicket` (which looks a code up by
 * hash) has no rate limiting — so any waiting ticket in a queue is
 * realistically brute-forceable by a simple script trying all 220 codes.
 * Claiming transfers the ticket, so a successful guess silently locks the
 * real customer out of their own place in line. Revisit this (a rate limit
 * on claimTicket, or more characters) if that turns out to matter in
 * practice.
 */
export function generateResumeCode(): string {
  let code = '';
  for (let i = 0; i < PAIR_COUNT; i++) {
    code += LETTERS[randomInt(LETTERS.length)];
    code += DIGITS[randomInt(DIGITS.length)];
  }
  return code;
}

/**
 * The hash, scoped to its queue, is what `claimTicket` looks a code up by, so
 * the same code issued in two queues does not collide. The plain code is
 * stored beside it too, on the private contact doc only staff and the holder
 * can read, so staff can see it on the serve screen — a deliberate choice
 * over keeping it unreadable (CLAUDE.md decision 15).
 */
export function hashResumeCode(queueId: string, code: string): string {
  return createHash('sha256')
    .update(`${queueId}:${code.toUpperCase()}`)
    .digest('hex');
}
