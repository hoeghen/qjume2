import { HttpsError, type FunctionsErrorCode } from 'firebase-functions/v2/https';
import type { QueueErrorReason } from '../../../src/types/index.js';

/**
 * Every refusal carries a machine-readable `reason` alongside the message, so
 * the UI can branch on it without matching prose.
 */
export function fail(
  code: FunctionsErrorCode,
  reason: QueueErrorReason,
  message: string,
): HttpsError {
  return new HttpsError(code, message, { reason });
}
