/**
 * The action names an audit entry can carry.
 *
 * Deliberately not free text: a fixed list is what lets the log screen group
 * and filter, and what stops a future admin function from writing something
 * the log can't render.
 */
export type AdminAction =
  | 'shop.suspend'
  | 'shop.reinstate'
  | 'shop.update'
  | 'shop.delete'
  | 'queue.update';

/** One field's value before and after an edit, for the entries that changed. */
export interface AdminFieldChange {
  before: unknown;
  after: unknown;
}

/**
 * One row of the platform admin's audit trail.
 *
 * Written by the admin Cloud Functions themselves, in the same call that
 * makes the change — never by the client, and never as a separate request
 * that could succeed while the change it describes did not. Kept top-level
 * (`adminAuditLog/{id}`), not nested under the shop, so deleting a shop
 * cannot also delete the record that it was deleted.
 */
export interface AdminAuditEntry {
  action: AdminAction;
  adminUid: string;
  adminEmail: string | null;
  shopId: string;
  /** Null for a shop-level action. */
  queueId: string | null;
  /** One line for the log screen, e.g. "Suspended Riverside Pharmacy". */
  summary: string;
  /** Only the fields that changed. Null for actions with nothing to diff. */
  changes: Record<string, AdminFieldChange> | null;
  at: number;
}
