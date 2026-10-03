/**
 * Machine-readable reasons a queue mutation can be refused. Returned as the
 * `details.reason` of a Cloud Functions `HttpsError` so the UI can react
 * without string-matching a message.
 */
export type QueueErrorReason =
  | 'queue-not-found'
  | 'shop-not-found'
  | 'ticket-not-found'
  | 'station-not-found'
  /** A till that is serving or has a customer cannot be deleted. */
  | 'station-in-use'
  /** Another device has the till open; deleting needs `force`. */
  | 'station-held'
  | 'queue-not-accepting'
  | 'queue-full'
  | 'free-services-used-up'
  | 'already-in-queue'
  | 'exclusive-queue-conflict'
  | 'not-shop-owner'
  | 'not-ticket-owner'
  | 'ticket-not-waiting'
  | 'queue-empty'
  /** Contention closed the transaction before it committed; nothing advanced. */
  | 'contended'
  | 'payment-unverified'
  | 'not-shop-staff'
  | 'not-platform-admin'
  | 'address-not-found';
