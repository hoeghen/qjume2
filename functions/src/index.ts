import './lib/admin.js';

/**
 * Queue mechanics. These callables are the only path by which a ticket reaches
 * `serving`, `served`, `noShow` or `removed`: the security rules deny client
 * writes to tickets outright, so a customer cannot advance themselves.
 * See CLAUDE.md invariant 1.
 */
export { joinQueue } from './queue/joinQueue.js';
export { callNext } from './queue/callNext.js';
export { leaveQueue } from './queue/leaveQueue.js';
export { removeTicket } from './queue/removeTicket.js';
export { addWalkIn } from './queue/addWalkIn.js';
export { relinkTicket } from './queue/relinkTicket.js';
export { claimTicket } from './queue/claimTicket.js';
export { registerPushToken } from './queue/registerPushToken.js';

/**
 * Shop administration. Queue and station creation run here rather than as
 * client writes because the free-tier limits have to be counted server-side.
 * Invariant 5.
 */
export { createQueue } from './shop/createQueue.js';
export { updateQueue } from './shop/updateQueue.js';
export { deleteQueue } from './shop/deleteQueue.js';
export { deleteShop } from './shop/deleteShop.js';
export { claimStation } from './shop/claimStation.js';
export { startServing } from './shop/startServing.js';
export { stopServing } from './shop/stopServing.js';
export { closeQueue } from './shop/closeQueue.js';
export { addStaff, removeStaff } from './shop/staff.js';
export { suggestAddresses } from './geocoding/suggest.js';
export { reverseGeocode } from './geocoding/reverse.js';

/**
 * Billing. The plan is server-owned — every free-tier limit reads it, so an
 * owner who could write it would lift all of them at once.
 */
export { startCheckout, completeCheckout } from './billing/checkout.js';
export { stripeWebhook } from './billing/webhook.js';

/**
 * The abandoned-queue backstop. Whether a queue is available is now driven
 * entirely by explicit `startServing`/`stopServing` calls above — this is
 * only for the case where neither is ever called again because the device
 * serving it is simply gone. See `sweepAbandonedQueues` for why it needs a
 * schedule rather than a trigger.
 */
export { sweepAbandonedQueues } from './presence/sweepAbandonedQueues.js';

/**
 * Platform admin. Every one of these requires the `platformAdmin` custom
 * claim (`requirePlatformAdmin`), bypasses the shop-owner checks the
 * equivalent owner actions carry, and writes to `adminAuditLog`. CLAUDE.md
 * decision 9.
 */
export { suspendShop, reinstateShop } from './admin/suspendShop.js';
export { adminUpdateShop } from './admin/updateShop.js';
export { adminUpdateQueue } from './admin/updateQueue.js';
export { adminDeleteQueue } from './admin/deleteQueue.js';
export { adminDeleteShop } from './admin/deleteShop.js';
