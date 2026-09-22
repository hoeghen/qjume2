import { type Firestore, type Transaction } from 'firebase-admin/firestore';
import type { AdminAction, AdminFieldChange } from '../../../src/types/index.js';

export interface AuditLogInput {
  action: AdminAction;
  adminUid: string;
  adminEmail: string | null;
  shopId: string;
  queueId?: string | null;
  summary: string;
  changes?: Record<string, AdminFieldChange> | null;
}

/**
 * Records one admin action.
 *
 * Written inside the same transaction as the change it describes wherever
 * the caller has one open — a write that succeeds and a log entry that
 * doesn't (or the reverse) is exactly the gap an audit trail exists to close.
 * Top-level (`adminAuditLog/{id}`), so deleting a shop can never delete the
 * record that it happened.
 */
export async function logAdminAction(
  firestore: Firestore,
  tx: Transaction | null,
  input: AuditLogInput,
): Promise<void> {
  const ref = firestore.collection('adminAuditLog').doc();
  const entry = {
    action: input.action,
    adminUid: input.adminUid,
    adminEmail: input.adminEmail,
    shopId: input.shopId,
    queueId: input.queueId ?? null,
    summary: input.summary,
    changes: input.changes ?? null,
    at: Date.now(),
  };
  // Inside a transaction, `tx.set` is a synchronous enqueue — there is
  // nothing to await, and the commit is the caller's own. Outside one (the
  // two actions that cannot be transactional — see deleteShop.ts) this is a
  // real write, and every caller awaits it so "the action happened" and "the
  // log says so" are never in a race a fast-reading test could win.
  if (tx) tx.set(ref, entry);
  else await ref.set(entry);
}

/**
 * The changed subset of two field maps, `before`/`after` per key.
 *
 * Used so an edit's log entry says what actually moved rather than the whole
 * form — a shop with one field touched should not read as eleven.
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, AdminFieldChange> {
  const changes: Record<string, AdminFieldChange> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = { before: before[key] ?? null, after: after[key] };
    }
  }
  return changes;
}
