import './lib/admin.js';

/**
 * Queue mechanics. These four callables are the only path by which a ticket
 * reaches `serving`, `served`, `noShow` or `removed`: the security rules deny
 * client writes to tickets outright, so a customer cannot advance themselves.
 * See CLAUDE.md invariant 1.
 */
export { joinQueue } from './queue/joinQueue.js';
export { callNext } from './queue/callNext.js';
export { leaveQueue } from './queue/leaveQueue.js';
export { removeTicket } from './queue/removeTicket.js';
