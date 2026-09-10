import { useEffect, useState } from 'react';
import { enablePush, pushAvailability, type PushAvailability } from '../../../lib/push.js';
import { messageOf, registerPushToken } from '../../../lib/functions.js';

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
  const [availability, setAvailability] = useState<PushAvailability | null>(null);
  const [enabled, setEnabled] = useState(false);
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

  if (availability === null || enabled) return null;

  if (availability === 'unsupported') return null;

  if (availability === 'denied') {
    return (
      <p className="notice">
        Notifications are switched off for this site. Your place is on this
        screen either way, and we&rsquo;ll email you if you gave us an address.
      </p>
    );
  }

  if (availability === 'needs-install') {
    return (
      <div className="notice">
        <p>
          <strong>Want a nudge when your turn is close?</strong>
        </p>
        <p>
          On iPhone that needs Qjume on your Home Screen first. Tap{' '}
          <strong>Share</strong>, then <strong>Add to Home Screen</strong>, and
          open it from there.
        </p>
        <p className="hint">
          Skip it if you like — this page keeps working, and we&rsquo;ll email
          you if you gave us an address.
        </p>
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
        setEnabled(true);
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
        {busy ? 'Turning on…' : 'Notify me when my turn is close'}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
