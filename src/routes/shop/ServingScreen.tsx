import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { queueDoc } from '../../lib/firestore/paths.js';
import { setQueueStatus } from '../../lib/firestore/writes.js';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import {
  servingTickets,
  stationsOf,
  waitingTickets,
} from '../../lib/firestore/queries.js';
import { callNext, messageOf } from '../../lib/functions.js';
import { useOfflineServing } from '../../lib/hooks/useOfflineServing.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { PauseBanner } from './components/PauseBanner.js';
import { StationPicker } from './components/StationPicker.js';
import { UpcomingList } from './components/UpcomingList.js';
import { WalkInDialog } from './components/WalkInDialog.js';
import { CloseDialog } from './components/CloseDialog.js';
import { QrDialog } from './components/QrDialog.js';

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
  const { t, tn } = useT();
  const { queueId = '' } = useParams();
  const [station, setStation] = useState<{ id: string; label: string } | null>(
    () => {
      const id = recallStation(queueId);
      return id ? { id, label: '' } : null;
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showQr, setShowQr] = useState(false);

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

  const { data: stations } = useCollection(
    stationsOf(shopId, queueId),
    `${shopId}/${queueId}/serving-stations`,
  );
  // With one counter there is nothing to distinguish, so naming it is noise.
  const manyTills = (stations?.length ?? 1) > 1;
  const tillName = (id: string | null) =>
    stations?.find((s) => s.id === id)?.label ?? '';

  const onPick = useCallback(
    (id: string, label: string) => {
      rememberStation(queueId, id);
      setStation({ id, label });
    },
    [queueId],
  );

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
        setError(messageOf(e));
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
        </div>
      )}
      {offline.online && offline.pending > 0 && (
        <div className="status-banner status-paused" role="status">
          <strong>{t('shop.serving.catchingUpTitle')}</strong>
          <span>{t('shop.serving.catchingUpBody', { count: offline.pending })}</span>
        </div>
      )}
      <PauseBanner status={q.status} />

      <header className="serving-header">
        <div>
          <h1>{q.name}</h1>
          <p className="muted">
            {(manyTills && station.label) || t('shop.serving.servingLabel')} ·{' '}
            {t('shop.serving.waitingCount', { count: waitingNow })}
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
            {manyTills && <p className="called-station">{station.label}</p>}
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
          onClick={() => {
            rememberStation(queueId, null);
            setStation(null);
          }}
        >
          {t('shop.serving.changePosition')}
        </button>
      </footer>

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
          queueName={q.name}
          onClose={() => setShowQr(false)}
        />
      )}
    </main>
  );
}
