import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { messageOf } from '../lib/functions.js';

interface Props {
  /** The URL the code carries. Build it with `counterJoinUrl`. */
  url: string;
  /** Rendered edge length in pixels. The image itself is always 512. */
  size?: number;
  className?: string;
}

/**
 * A scannable code for one queue.
 *
 * Rendered at a fixed 512px and scaled by CSS: the monitor's panel is as wide
 * as the display allows, and re-encoding on every resize would redraw the code
 * a phone is in the middle of reading.
 */
export function JoinQr({ url, size, className }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error) {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  }

  // Nothing until it is encoded: an <img> with no src is a broken-image icon,
  // and on the wall that is worse than a moment of blank.
  if (!dataUrl) return null;

  return (
    <img
      className={className ?? 'qr'}
      src={dataUrl}
      alt={`QR code linking to ${url}`}
      {...(size === undefined ? {} : { style: { width: size } })}
    />
  );
}
