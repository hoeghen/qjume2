import { createHash, randomInt } from 'node:crypto';

/**
 * No I, L, O or U, so a code read aloud over a counter cannot be
 * transcribed ambiguously.
 */
const LETTERS = 'ABCDEFGHJKMNPQRSTVWXYZ';
const DIGITS = '0123456789';
const PAIR_COUNT = 3;

/**
 * PRD 12.3 proposes six alphanumeric characters, scoped per queue. Drawn as
 * three letter-digit pairs (K3F9X2, not a character drawn from a single
 * mixed alphabet) — a fixed, guessable shape is a little easier to hold in
 * memory for the short while between joining and resuming than six
 * characters with no pattern to them at all. It costs some entropy (22³ ×
 * 10³ ≈ 10.6 million combinations, versus 32⁶ ≈ 1.1 billion for six
 * unconstrained characters), which is still far more than any one queue's
 * waiting list could plausibly be brute-forced across.
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
