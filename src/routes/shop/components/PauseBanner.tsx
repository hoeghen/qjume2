import type { QueueStatus } from '../../../types/index.js';

const BANNERS: Partial<Record<QueueStatus, { label: string; detail: string }>> = {
  paused: {
    label: 'Paused',
    detail: 'Nobody is being called. Customers can still see their place.',
  },
  drainMode: {
    label: 'Closing',
    detail: 'No new joiners. Keep serving everyone already waiting.',
  },
  unavailable: {
    label: 'Offline',
    detail:
      'This device lost its connection. Keep serving — it will sync when you are back.',
  },
  closed: { label: 'Closed', detail: 'Open the queue to start taking joiners.' },
};

/**
 * A paused queue that nobody notices is worse than a closed one: customers keep
 * waiting for a turn that is not coming. The state has to be impossible to miss
 * from across a counter, which is why this is a full-width bar and not a chip.
 */
export function PauseBanner({ status }: { status: QueueStatus }) {
  const banner = BANNERS[status];
  if (!banner) return null;

  return (
    <div className={`status-banner status-${status}`} role="status">
      <strong>{banner.label}</strong>
      <span>{banner.detail}</span>
    </div>
  );
}
