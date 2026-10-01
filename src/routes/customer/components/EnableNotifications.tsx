import { useEffect, useState } from 'react';
import {
  currentPushToken,
  enablePush,
  pushAvailability,
  pushRemembered,
  rememberPush,
  resumeForegroundPush,
  type PushAvailability,
} from '../../../lib/push.js';
import {
  canPromptInstall,
  isInstalled,
  onInstallChange,
  promptInstall,
} from '../../../lib/install.js';
import {
  messageOf,
  registerPushToken,
  unregisterPushToken,
} from '../../../lib/functions.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';

interface Props {
  shopId: string;
  queueId: string;
  ticketId: string;
}

/**
 * Offer push, honestly.
 *
 * On iOS this is the whole awkward dance: web push reaches only a PWA added to
 * the Home Screen, so an uninstalled Safari tab is told how to install rather
 * than shown a prompt that cannot work. The permission request itself always
 * comes from a tap, never on load.
 *
 * Nothing here is required. A customer who ignores all of it still has their
 * live position on screen, and an email if they gave one — which is the point:
 * this is an extra channel, not the delivery mechanism.
 */
export function EnableNotifications({ shopId, queueId, ticketId }: Props) {
  const { t } = useT();
  const [availability, setAvailability] = useState<PushAvailability | null>(null);
  const [enabled, setEnabled] = useState(false);
  // Kept so "Disable notifications" can remove the same token it added —
  // `unregisterPushToken` only ever touches this one ticket's copy of it.
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set by the tap that turned push on, so the install suggestion appears at
  // that moment rather than nagging on every return visit.
  const [justEnabled, setJustEnabled] = useState(false);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [canInstall, setCanInstall] = useState(canPromptInstall());

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      setCanInstall(canPromptInstall());
      void isInstalled().then((i) => {
        if (!cancelled) setInstalled(i);
      });
    };
    refresh();
    const unsubscribe = onInstallChange(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    void resumeForegroundPush();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void pushAvailability().then((a) => {
      if (cancelled) return;
      setAvailability(a);
      if (!pushRemembered(ticketId)) return;
      if (a !== 'ready' || Notification.permission !== 'granted') {
        // Permission was withdrawn in the browser since; forget, don't pretend.
        rememberPush(ticketId, false);
        return;
      }
      // Turned on here before: show it as on straight away, then re-read the
      // token — they rotate — and re-register it, which is a no-op when
      // unchanged. A failure leaves it shown as on: the last token registered
      // is still on the ticket, so alerts are still going somewhere.
      setEnabled(true);
      void currentPushToken()
        .then(async (token) => {
          if (!token || cancelled) return;
          await registerPushToken({ shopId, queueId, ticketId, token });
          if (!cancelled) setPushToken(token);
        })
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [shopId, queueId, ticketId]);

  if (availability === null) return null;

  if (enabled) {
    return (
      <div className="notice">
        {justEnabled && installed === false && (
          <div className="install-hint">
            <p>
              <strong>{t('enableNotifications.installTitle')}</strong>
            </p>
            <p>{t('enableNotifications.installBody')}</p>
            {canInstall ? (
              <button type="button" onClick={install}>
                {t('enableNotifications.installButton')}
              </button>
            ) : (
              <p className="hint">{t('enableNotifications.installManual')}</p>
            )}
          </div>
        )}
        <button type="button" className="secondary" disabled={busy} onClick={turnOff}>
          {busy
            ? t('enableNotifications.disabling')
            : t('enableNotifications.disableNotifications')}
        </button>
        {error && (
          <details className="error-details">
            <summary role="alert">{t('enableNotifications.turnOffError')}</summary>
            <p className="hint">{error}</p>
          </details>
        )}
      </div>
    );
  }

  if (availability === 'unsupported') return null;

  if (availability === 'denied') {
    return <p className="notice">{t('enableNotifications.off')}</p>;
  }

  if (availability === 'needs-install') {
    return (
      <div className="notice">
        <p>
          <strong>{t('enableNotifications.needsInstallTitle')}</strong>
        </p>
        <p>
          {t('enableNotifications.needsInstallBefore')}
          <strong>{t('enableNotifications.share')}</strong>
          {t('enableNotifications.needsInstallMiddle')}
          <strong>{t('enableNotifications.addToHomeScreen')}</strong>
          {t('enableNotifications.needsInstallAfter')}
        </p>
        <p className="hint">{t('enableNotifications.needsInstallHint')}</p>
      </div>
    );
  }

  function turnOn() {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const token = await enablePush();
        if (!token) {
          setAvailability('denied');
          return;
        }
        await registerPushToken({ shopId, queueId, ticketId, token });
        rememberPush(ticketId, true);
        setPushToken(token);
        setEnabled(true);
        setJustEnabled(true);
      } catch (e) {
        setError(messageOf(e));
      } finally {
        setBusy(false);
      }
    })();
  }

  function install() {
    void promptInstall().then((accepted) => {
      if (accepted) setInstalled(true);
    });
  }

  function turnOff() {
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        // On a return visit the token is re-read in the background, so it
        // may not be here yet — look it up rather than hiding the button
        // while the server goes on sending to it.
        const token = pushToken ?? (await currentPushToken());
        if (token) {
          await unregisterPushToken({ shopId, queueId, ticketId, token });
        }
        rememberPush(ticketId, false);
        setPushToken(null);
        setEnabled(false);
        setJustEnabled(false);
      } catch (e) {
        setError(messageOf(e));
      } finally {
        setBusy(false);
      }
    })();
  }


  return (
    <div className="notice">
      <button type="button" className="secondary" disabled={busy} onClick={turnOn}>
        {busy ? t('enableNotifications.turningOn') : t('enableNotifications.turnOnQuestion')}
      </button>
      {error && (
        <details className="error-details">
          <summary role="alert">{t('enableNotifications.turnOnError')}</summary>
          <p className="hint">{error}</p>
        </details>
      )}
    </div>
  );
}
