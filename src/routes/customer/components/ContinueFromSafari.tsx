import { useState } from 'react';
import { claimTransfer, reasonOf } from '../../../lib/functions.js';
import { signInAsGuest } from '../../../lib/auth.js';
import { useAuth } from '../../../lib/hooks/useAuth.js';
import { heldTickets, rememberTicket } from '../../../lib/myTickets.js';
import { isIos, isStandalone } from '../../../lib/platform.js';
import { parseTransfer } from '../../../lib/transfer.js';
import { useLocalizedNavigate } from '../../../lib/i18n/LocalizedLink.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';

/**
 * The Home Screen app's half of moving a place across from Safari.
 *
 * Shown only in the installed app on an iPhone, and only while it holds no
 * place of its own — which is exactly the state it opens in the first time,
 * because it shares nothing with Safari. Pasting needs a tap (iOS asks before
 * handing over the clipboard), so this is a button rather than automatic.
 * Every way it can fail ends in the same honest advice: join again here.
 */
export function ContinueFromSafari() {
  const { t } = useT();
  const { user } = useAuth();
  const navigate = useLocalizedNavigate();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [shown] = useState(
    () => isIos() && isStandalone() && heldTickets().length === 0,
  );

  if (!shown) return null;

  function paste() {
    setBusy(true);
    setFailed(null);
    void (async () => {
      try {
        const text = await navigator.clipboard.readText();
        const payload = parseTransfer(text);
        if (!payload) {
          setFailed(t('continueFromSafari.nothingCopied'));
          return;
        }
        if (!user) await signInAsGuest();
        const { ticketId } = await claimTransfer(payload);
        rememberTicket(payload.shopId, payload.queueId, ticketId);
        navigate(`/q/${payload.shopId}/${payload.queueId}`);
      } catch (e) {
        // Pasting refused, a stale or spent link, or the place has ended:
        // all the same to the person holding the phone.
        setFailed(
          reasonOf(e) === 'already-in-queue'
            ? t('continueFromSafari.alreadyHere')
            : t('continueFromSafari.couldNotMove'),
        );
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <div className="notice continue-from-safari">
      <button type="button" className="secondary" disabled={busy} onClick={paste}>
        {busy ? t('continueFromSafari.moving') : t('continueFromSafari.button')}
      </button>
      {failed ? (
        <p className="hint" role="alert">
          {failed}
        </p>
      ) : (
        <p className="hint">{t('continueFromSafari.hint')}</p>
      )}
    </div>
  );
}
