import { JoinQr } from '../../../components/JoinQr.js';
import { counterJoinUrl } from '../../../lib/url.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';

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
  const { t } = useT();
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-label={t('shop.qrDialog.ariaLabel')}>
      <div className="dialog-body">
        <h2>{t('shop.qrDialog.title')}</h2>
        <p className="muted">{queueName}</p>
        <JoinQr url={counterJoinUrl(shopId, queueId)} />
        <p className="hint">{t('shop.qrDialog.hint')}</p>
        <button type="button" onClick={onClose}>
          {t('shop.qrDialog.done')}
        </button>
      </div>
    </div>
  );
}
