import { createHash, randomInt } from 'node:crypto';

/**
 * Crockford-style alphabet: no I, L, O or U, so a code read aloud over a
 * counter cannot be transcribed ambiguously.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 6;

/** PRD 12.3 proposes six alphanumeric characters, scoped per queue. */
export function generateResumeCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
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
