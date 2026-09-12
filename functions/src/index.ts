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
export { claimStation } from './shop/claimStation.js';
export { closeQueue } from './shop/closeQueue.js';
export { addStaff, removeStaff } from './shop/staff.js';

/**
 * Billing. The plan is server-owned — every free-tier limit reads it, so an
 * owner who could write it would lift all of them at once.
 */
export { startCheckout, completeCheckout } from './billing/checkout.js';

/**
 * Presence. Realtime Database is used for this and nothing else — Firestore
 * cannot tell a closed tab from a dead network, and RTDB's onDisconnect can.
 */
export { mirrorPresence } from './presence/mirror.js';
