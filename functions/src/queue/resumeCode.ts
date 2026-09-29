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
 * Codes are stored hashed and scoped to their queue, so the same code issued in
 * two queues does not collide and a database read does not surrender the code
 * itself. The plaintext is returned to the customer once, at join time.
 */
export function hashResumeCode(queueId: string, code: string): string {
  return createHash('sha256')
    .update(`${queueId}:${code.toUpperCase()}`)
    .digest('hex');
}
