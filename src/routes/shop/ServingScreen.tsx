import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { queueDoc } from '../../lib/firestore/paths.js';
import { setQueueStatus } from '../../lib/firestore/writes.js';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import {
  servingTickets,
  stationsOf,
  waitingTickets,
} from '../../lib/firestore/queries.js';
import {
  callNext,
  claimStation,
  messageOf,
  reasonOf,
  releaseStation,
  startServing,
  stopServing,
} from '../../lib/functions.js';
import { deviceId } from '../../lib/device.js';
import { Spinner } from '../../components/Spinner.js';
import { useOfflineServing } from '../../lib/hooks/useOfflineServing.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { tillLabel } from '../../lib/tills.js';
import { formatWait } from '../../lib/format.js';
import {
  estimatedWaitSeconds,
  serviceTimeSeconds,
  staffedTills,
} from '../../lib/queue/waitTime.js';
import { PauseBanner } from './components/PauseBanner.js';
import { StationPicker } from './components/StationPicker.js';
import { UpcomingList } from './components/UpcomingList.js';
import { WalkInDialog } from './components/WalkInDialog.js';
import { CloseDialog } from './components/CloseDialog.js';
import { QrDialog } from './components/QrDialog.js';
import { SwitchStationDialog } from './components/SwitchStationDialog.js';

const STATION_KEY = 'qjume:station';

function rememberStation(queueId: string, stationId: string | null) {
  try {
    if (stationId) {
      window.localStorage.setItem(`${STATION_KEY}:${queueId}`, stationId);
    } else {
      window.localStorage.removeItem(`${STATION_KEY}:${queueId}`);
    }
  } catch {
    // A reload will simply ask which position they are on.
  }
}

function recallStation(queueId: string): string | null {
  try {
    return window.localStorage.getItem(`${STATION_KEY}:${queueId}`);
  } catch {
    return null;
  }
}

export function ServingScreen({ shopId }: { shopId: string }) {
  const { t, tn, locale } = useT();
  const { queueId = '' } = useParams();
  const [station, setStation] = useState<{ id: string; label: string } | null>(
    () => {
      const id = recallStation(queueId);
      return id ? { id, label: '' } : null;
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servingBusy, setServingBusy] = useState(false);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  // Set by "Change station", so the picker asks rather than putting them
  // straight back on the only till there is.
  const [choosingAgain, setChoosingAgain] = useState(false);
  // Why the picker is showing when nobody asked for it.
  const [pickerNotice, setPickerNotice] = useState<string | null>(null);

  const offline = useOfflineServing(shopId, queueId, station?.id ?? null);

  const queue = useDoc(queueId ? queueDoc(shopId, queueId) : null);
  const { data: waiting } = useCollection(
    queueId ? waitingTickets(shopId, queueId) : null,
    `${shopId}/${queueId}/waiting`,
  );
  const { data: serving } = useCollection(
    queueId ? servingTickets(shopId, queueId) : null,
    `${shopId}/${queueId}/serving`,
  );

  const {
    data: stations,
    loading: stationsLoading,
    fromCache: stationsFromCache,
  } = useCollection(
    stationsOf(shopId, queueId),
    `${shopId}/${queueId}/serving-stations`,
  );
  // With one counter there is nothing to distinguish, so naming it is noise.
  const manyTills = (stations?.length ?? 1) > 1;
  const tillName = (id: string | null) => {
    const label = stations?.find((s) => s.id === id)?.label;
    return label === undefined ? '' : tillLabel(label, locale);
  };

  const myStation = stations?.find((s) => s.id === station?.id);

  // See the start-serving effect below; declared here because `tillGone`
  // resets it too.
  const startAttempted = useRef(false);
  // The automatic start is in flight; "Start serving" waits it out rather
  // than flashing up for the moment before the till reads as serving.
  const [autoStarting, setAutoStarting] = useState(false);

  // Back to the picker, saying why, when this till no longer exists —
  // deleted from another device. Clears the start guard so whichever till is
  // picked next starts serving, the same as a deliberate switch.
  const tillGone = useCallback(() => {
    rememberStation(queueId, null);
    startAttempted.current = false;
    setError(null);
    setPickerNotice(t('shop.serving.tillDeleted'));
    setStation(null);
  }, [queueId, t]);

  // A till counts as gone once it has been missing from the live list after
  // being in it — or, for one remembered from before this page loaded, after
  // the first full list. A till just opened here can be missing for a moment
  // before its snapshot arrives; that is not a deletion.
  const remembered = useRef(station?.id ?? null);
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (stationsLoading || !stations || !station) return;
    if (stations.some((s) => s.id === station.id)) {
      seen.current = station.id;
      return;
    }
    // Only the server can say a till is gone. Offline, a list served from the
    // cache can be missing a till that exists — taking that for a deletion
    // threw the counter out of its till the moment the connection dropped.
    if (stationsFromCache) return;
    if (seen.current === station.id || remembered.current === station.id) {
      remembered.current = null;
      seen.current = null;
      tillGone();
    }
  }, [stations, stationsLoading, stationsFromCache, station, tillGone]);

  // This device holds the till it stands at, so another device asks before
  // deleting it. Claimed whenever the hold is not ours — after picking, after
  // a reload, or after another device took it and let go.
  const me = deviceId();
  const claimed = useRef<string | null>(null);
  const listed = stations?.find((s) => s.id === station?.id);
  const holder = listed?.activeDeviceId ?? null;
  useEffect(() => {
    // Not before the till is in the list: missing means not arrived yet, or
    // deleted, which the effect above deals with.
    if (!station || !listed) return;
    if (holder === me || claimed.current === station.id) return;
    claimed.current = station.id;
    void claimStation({ shopId, queueId, stationId: station.id, deviceId: me }).catch(
      (e) => {
        if (reasonOf(e) === 'station-not-found') tillGone();
      },
    );
  }, [station, listed, holder, me, shopId, queueId, tillGone]);
  const iAmServing = myStation?.serving ?? false;

  const onPick = useCallback(
    (id: string, label: string) => {
      rememberStation(queueId, id);
      setPickerNotice(null);
      setStation({ id, label });
    },
    [queueId],
  );

  // Arriving here with a station already picked is the "serving" signal
  // itself — there is no separate confirmation to tap. Resolved once per
  // mount, the moment the station's current state is known, whichever way
  // it goes: the ref is set even when it was already serving, or an
  // explicit "Stop serving" right after would see `iAmServing` flip to
  // false and — since that is this same effect's own trigger to start —
  // immediately undo the stop. A failure surfaces through the existing
  // error banner and a reload (which remounts) is the retry, rather than a
  // dedicated button for a case that should be rare.
  useEffect(() => {
    if (!station || stationsLoading || startAttempted.current) return;
    startAttempted.current = true;
    if (iAmServing) return;
    setAutoStarting(true);
    void startServing({ shopId, queueId, stationId: station.id })
      .catch((e) => {
        if (reasonOf(e) === 'station-not-found') {
          tillGone();
          return;
        }
        setError(messageOf(e));
        startAttempted.current = false;
      })
      .finally(() => setAutoStarting(false));
  }, [station, stationsLoading, iAmServing, shopId, queueId, tillGone]);

  if (queue.loading) return <p className="panel">{t('common.loading')}</p>;
  if (!queue.data) return <p className="panel">{t('shop.serving.queueNotFound')}</p>;

  const q = queue.data;
  const mine = serving?.find((ticket) => ticket.station === station?.id) ?? null;
  const others = serving?.filter((ticket) => ticket.station !== station?.id) ?? [];
  // Offline, the server's idea of who is being served is frozen, so the till
  // reads ahead in its cached waiting list by however many taps it has taken.
  const offlineCurrent =
    offline.localOffset > 0 ? (waiting?.[offline.localOffset - 1] ?? null) : null;
  const currentName = offlineCurrent?.displayName ?? mine?.displayName ?? null;
  const upcoming = (waiting ?? []).slice(offline.localOffset);
  // The server's count is frozen while offline; showing it beside a list that
  // has moved on would have the header contradicting the rows below it.
  const waitingNow = Math.max(0, q.waitingCount - offline.localOffset);

  if (!station) {
    return (
      <StationPicker
        shopId={shopId}
        queueId={queueId}
        stationId={null}
        autoPick={!choosingAgain && !pickerNotice}
        notice={pickerNotice}
        onPick={onPick}
      />
    );
  }

  function advance(outcome: 'served' | 'noShow') {
    if (!station) return;

    // No network means no Cloud Function, and the client may not write ticket
    // state itself. Record the decision and keep the till moving; it is
    // replayed in order when the connection returns.
    if (!offline.online) {
      offline.advance(outcome);
      return;
    }

    setBusy(true);
    setError(null);
    void (async () => {
      try {
        await callNext({
          shopId,
          queueId,
          stationId: station.id,
          ...(outcome === 'noShow' ? { outcome } : {}),
        });
      } catch (e) {
        if (reasonOf(e) === 'station-not-found') tillGone();
        else setError(messageOf(e));
      } finally {
        setBusy(false);
      }
    })();
  }

  async function setStatus(status: 'open' | 'paused') {
    setError(null);
    try {
      await setQueueStatus(shopId, queueId, status);
    } catch (e) {
      setError(messageOf(e));
    }
  }

  // Starting is automatic (see the effect above); stopping stays a
  // deliberate tap — explicit, and not tied to this tab being open or
  // connected. See src/lib/queue/presence.ts. Closing the phone or losing
  // signal leaves this untouched; only this tap, or hours of silence,
  // changes it.
  async function stopServingNow() {
    if (!station) return;
    setServingBusy(true);
    setError(null);
    try {
      await stopServing({ shopId, queueId, stationId: station.id });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setServingBusy(false);
    }
  }

  // Starting again after a deliberate stop. The automatic start above runs
  // once per till, so without this tap a stopped till stays stopped until
  // the page is reloaded.
  async function startServingNow() {
    if (!station) return;
    setServingBusy(true);
    setError(null);
    try {
      await startServing({ shopId, queueId, stationId: station.id });
    } catch (e) {
      if (reasonOf(e) === 'station-not-found') tillGone();
      else setError(messageOf(e));
    } finally {
      setServingBusy(false);
    }
  }

  // Leaving a till: finish its customer if asked, stop it serving, and clear
  // the start guard so the next till picked starts serving by itself — the
  // screen does not remount, so without that the new till never would.
  async function leaveStation(finishCurrent: boolean) {
    if (!station) return;
    setServingBusy(true);
    setSwitchError(null);
    try {
      if (finishCurrent) {
        await callNext({ shopId, queueId, stationId: station.id, finishOnly: true });
      }
    } catch (e) {
      // The customer is still at this till; switching now would strand them.
      setSwitchError(messageOf(e));
      setServingBusy(false);
      return;
    }
    if (iAmServing) {
      // Best-effort: the abandoned-queue sweep catches a till left serving.
      await stopServing({ shopId, queueId, stationId: station.id }).catch(() => {});
    }
    // Let go of the till, so deleting it needs no "delete anyway?".
    await releaseStation({ shopId, queueId, stationId: station.id, deviceId: me }).catch(
      () => {},
    );
    claimed.current = null;
    seen.current = null;
    setServingBusy(false);
    setConfirmSwitch(false);
    startAttempted.current = false;
    rememberStation(queueId, null);
    setChoosingAgain(true);
    setStation(null);
  }

  return (
    <main className="serving">
      {!offline.online && (
        <div className="status-banner status-unavailable" role="status">
          <strong>{t('shop.serving.noConnectionTitle')}</strong>
          <span>
            {t('shop.serving.noConnectionBefore')}
            {tn(offline.pending, 'shop.serving.pendingTaps')}
            {t('shop.serving.noConnectionAfter')}
          </span>
          {/* The connection is retried on its own the whole time; without
              this the banner looks the same whether it is trying or stuck. */}
          <span className="loading-row">
            <Spinner /> {t('shop.serving.reconnecting')}
          </span>
        </div>
      )}
      {offline.online && offline.pending > 0 && (
        <div className="status-banner status-paused" role="status">
          <strong className="loading-row">
            <Spinner /> {t('shop.serving.catchingUpTitle')}
          </strong>
          <span>{t('shop.serving.catchingUpBody', { count: offline.pending })}</span>
        </div>
      )}
      <PauseBanner status={q.status} />

      {iAmServing ? (
        <div className="serving-toggle">
          {/* One word: the banner above already explains being offline. */}
          <span className={offline.online ? 'muted' : 'serving-offline'}>
            {t(offline.online ? 'shop.serving.ready' : 'shop.serving.offline')}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={servingBusy}
            onClick={() => void stopServingNow()}
          >
            {t('shop.serving.stopServing')}
          </button>
        </div>
      ) : (
        // Stopped — by the button above, another device, or the abandoned
        // sweep. Not while the automatic start is on its way, and only once
        // the till is in the live list.
        myStation && !autoStarting && (
          <div className="serving-toggle">
            <span className="muted">{t('shop.serving.stopped')}</span>
            <button
              type="button"
              disabled={servingBusy || !offline.online}
              onClick={() => void startServingNow()}
            >
              {t('shop.serving.startServing')}
            </button>
          </div>
        )
      )}

      <header className="serving-header">
        <div>
          <h1>{q.name || q.shopName}</h1>
          <p className="muted">
            {/* Looked up, not taken from `station.label`: a till recalled
                after a reload has only its id. */}
            {manyTills ? (
              <strong className="serving-till">{tillName(station.id)}</strong>
            ) : (
              t('shop.serving.servingLabel')
            )}{' '}
            ·{' '}
            {t('shop.serving.waitingCount', { count: waitingNow })}
          </p>
          {/* The figures every wait estimate is built from, so staff can see
              what customers are told and why (CLAUDE.md decision 18). The
              join wait uses the same inputs as the queue page a joiner sees. */}
          <p className="muted serving-estimate">
            {t(
              q.observedServiceTimeSeconds != null
                ? 'shop.serving.serviceTimeLearned'
                : 'shop.serving.serviceTimeSet',
              {
                time: formatServiceTime(serviceTimeSeconds(q)),
                count: q.servedSampleCount,
              },
            )}{' '}
            ·{' '}
            {t('shop.serving.joinWait', {
              wait: lowerFirst(
                formatWait(
                  estimatedWaitSeconds(q.waitingCount, q, staffedTills(stations)),
                  t,
                ),
              ),
            })}
          </p>
        </div>
        <LocalizedLink to="/shop" className="link">
          {t('shop.serving.allQueues')}
        </LocalizedLink>
      </header>

      <section className="now-serving">
        {currentName ? (
          <>
            <p className="label">{t('shop.serving.nowServing')}</p>
            <p className="called-name">{currentName}</p>
            {manyTills && <p className="called-station">{tillName(station.id)}</p>}
          </>
        ) : (
          <p className="called-name muted">
            {q.waitingCount > 0 ? t('shop.serving.readyForNext') : t('shop.serving.nobodyWaiting')}
          </p>
        )}
      </section>

      <div className="serve-actions">
        <button
          type="button"
          className="primary big-touch"
          disabled={busy || q.status === 'paused'}
          onClick={() => advance('served')}
        >
          {currentName ? t('shop.serving.doneNext') : t('shop.serving.callNext')}
        </button>
        <button
          type="button"
          className="secondary big-touch"
          disabled={busy || !currentName}
          onClick={() => advance('noShow')}
        >
          {t('shop.serving.notHere')}
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {others.length > 0 && (
        <section>
          <h2>{t('shop.serving.alsoServing')}</h2>
          <ul className="pairings">
            {others.map((ticket) => (
              <li key={ticket.id}>
                <strong>{ticket.displayName}</strong> — {tillName(ticket.station)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>{t('shop.serving.waitingHeading')}</h2>
        <UpcomingList
          shopId={shopId}
          queueId={queueId}
          waiting={upcoming}
          online={offline.online}
          waitSeconds={(ahead) =>
            estimatedWaitSeconds(ahead, q, staffedTills(stations))
          }
        />
      </section>

      <footer className="serve-footer">
        {q.status === 'paused' ? (
          <button type="button" onClick={() => void setStatus('open')}>
            {t('shop.serving.resume')}
          </button>
        ) : (
          <button
            type="button"
            className="secondary"
            disabled={q.status !== 'open'}
            onClick={() => void setStatus('paused')}
          >
            {t('shop.serving.pause')}
          </button>
        )}
        <button
          type="button"
          className="secondary"
          // Still available while draining: someone at the counter can be
          // added even once the queue is shut to remote joiners. Not available
          // offline — issuing a ticket number needs the server, and pretending
          // otherwise would hand someone a place that does not exist.
          disabled={
            !offline.online ||
            (q.status !== 'open' && q.status !== 'drainMode')
          }
          onClick={() => setShowWalkIn(true)}
        >
          {t('shop.serving.addWalkIn')}
        </button>
        {q.status === 'closed' ? (
          <button type="button" onClick={() => void setStatus('open')}>
            {t('shop.serving.openQueue')}
          </button>
        ) : (
          <button
            type="button"
            className="secondary"
            disabled={!offline.online}
            onClick={() => setShowClose(true)}
          >
            {t('shop.serving.close')}
          </button>
        )}
        <button
          type="button"
          className="secondary"
          onClick={() => setShowQr(true)}
        >
          {t('shop.serving.showQr')}
        </button>
        <button
          type="button"
          className="link"
          // Offline, saved taps belong to this till and must replay there.
          disabled={servingBusy || !offline.online || offline.pending > 0}
          onClick={() => {
            if (mine) {
              setSwitchError(null);
              setConfirmSwitch(true);
            } else {
              void leaveStation(false);
            }
          }}
        >
          {t('shop.serving.changeStation')}
        </button>
      </footer>

      {confirmSwitch && mine && (
        <SwitchStationDialog
          name={mine.displayName}
          busy={servingBusy}
          error={switchError}
          onDone={() => void leaveStation(true)}
          onCancel={() => setConfirmSwitch(false)}
        />
      )}
      {showWalkIn && (
        <WalkInDialog
          shopId={shopId}
          queueId={queueId}
          onClose={() => setShowWalkIn(false)}
        />
      )}
      {showClose && (
        <CloseDialog
          shopId={shopId}
          queueId={queueId}
          waitingCount={q.waitingCount}
          onClose={() => setShowClose(false)}
        />
      )}
      {showQr && (
        <QrDialog
          shopId={shopId}
          queueId={queueId}
          queueName={q.name || q.shopName}
          onClose={() => setShowQr(false)}
        />
      )}
    </main>
  );
}

/** "2 min 36 sek" — exact enough to check an estimate against by hand. */
function formatServiceTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s} s`;
  return s === 0 ? `${m} min` : `${m} min ${s} s`;
}

/** formatWait reads as a sentence on its own; here it follows a colon. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
