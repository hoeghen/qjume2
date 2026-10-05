import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import { fail } from '../lib/errors.js';
import { requireCaller } from '../lib/auth.js';
import { requireServeAccess } from '../lib/access.js';

export interface ResetServiceTimeRequest {
  shopId: string;
  queueId: string;
}

/**
 * Forget the learned service time, so the owner's own figure is used again
 * until real completions teach it a new one (CLAUDE.md decision 18).
 *
 * Learning starts from a clean slate: the first completion afterwards
 * replaces the owner's figure outright (`foldSample` weights it 1/1), so a
 * reset is the way to drop an average skewed by test runs. Anyone who can
 * serve may do it — it is reached from the serve screen, and the worst it
 * does is go back to the owner's own setting.
 */
export async function performResetServiceTime(
  firestore: Firestore,
  callerUid: string,
  input: ResetServiceTimeRequest,
): Promise<void> {
  const { shopId, queueId } = input;
  if (!shopId || !queueId) {
    throw fail(
      'invalid-argument',
      'queue-not-found',
      'shopId and queueId are required.',
    );
  }

  await requireServeAccess(firestore, shopId, callerUid);

  const queueRef = firestore.doc(`shops/${shopId}/queues/${queueId}`);
  await firestore.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(queueRef);
    if (!snap.exists) {
      throw fail('not-found', 'queue-not-found', 'Queue not found.');
    }
    tx.update(queueRef, {
      observedServiceTimeSeconds: null,
      servedSampleCount: 0,
    });
  });
}

export const resetServiceTime = onCall<ResetServiceTimeRequest, Promise<void>>(
  (request: CallableRequest<ResetServiceTimeRequest>) =>
    performResetServiceTime(db, requireCaller(request).uid, request.data),
);
