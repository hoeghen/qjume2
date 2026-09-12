import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { messageOf } from '../../../lib/functions.js';

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
 */
export function QrDialog({ shopId, queueId, queueName, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const url = `${window.location.origin}/q/${shopId}/${queueId}?join=1`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(messageOf(e));
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-label="Join QR code">
      <div className="dialog-body">
        <h2>Scan to join</h2>
        <p className="muted">{queueName}</p>
        {dataUrl && <img className="qr" src={dataUrl} alt={`QR code linking to ${url}`} />}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
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
