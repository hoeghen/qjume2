import { JoinQr } from '../../../components/JoinQr.js';
import { counterJoinUrl } from '../../../lib/url.js';

interface Props {
  shopId: string;
  queueId: string;
  queueName: string;
  onClose: () => void;
}

/**
 * The QR code for the counter.
 *
 * Scanning it drops a walk-in into the same queue on their own phone — the
 * same queue, the same order, no preferential treatment either way (PRD 4.4).
 * The monitor shows the same code on the wall; this one is for printing.
 */
export function QrDialog({ shopId, queueId, queueName, onClose }: Props) {
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-label="Join QR code">
      <div className="dialog-body">
        <h2>Scan to join</h2>
        <p className="muted">{queueName}</p>
        <JoinQr url={counterJoinUrl(shopId, queueId)} />
        <p className="hint">
          Print this for the counter. Scanning it joins this queue in the same
          order as everyone else.
        </p>
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
