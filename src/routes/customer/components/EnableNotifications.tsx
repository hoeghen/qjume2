import { useEffect, useState } from 'react';
import { enablePush, pushAvailability, type PushAvailability } from '../../../lib/push.js';
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

  useEffect(() => {
    let cancelled = false;
    void pushAvailability().then((a) => {
      if (!cancelled) setAvailability(a);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (availability === null) return null;

  if (enabled) {
    return (
      <div className="notice">
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
        setPushToken(token);
        setEnabled(true);
      } catch (e) {
        setError(messageOf(e));
      } finally {
        setBusy(false);
      }
    })();
  }

  function turnOff() {
    if (!pushToken) {
      // Nothing server-side to remove — the state itself is enough to fix.
      setEnabled(false);
      return;
    }
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        await unregisterPushToken({ shopId, queueId, ticketId, token: pushToken });
        setPushToken(null);
        setEnabled(false);
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
