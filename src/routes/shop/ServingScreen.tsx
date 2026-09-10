import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { updateDoc } from 'firebase/firestore';
import { queueDoc } from '../../lib/firestore/paths.js';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { servingTickets, waitingTickets } from '../../lib/firestore/queries.js';
import { callNext, messageOf } from '../../lib/functions.js';
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

  const queue = useDoc(queueId ? queueDoc(shopId, queueId) : null);
  const { data: waiting } = useCollection(
    queueId ? waitingTickets(shopId, queueId) : null,
    `${shopId}/${queueId}/waiting`,
  );
  const { data: serving } = useCollection(
    queueId ? servingTickets(shopId, queueId) : null,
    `${shopId}/${queueId}/serving`,
  );

  const onPick = useCallback(
    (id: string, label: string) => {
      rememberStation(queueId, id);
      setStation({ id, label });
    },
    [queueId],
  );

  if (queue.loading) return <p className="panel">Loading…</p>;
  if (!queue.data) return <p className="panel">Queue not found.</p>;

  const q = queue.data;
  const mine = serving?.find((t) => t.station === station?.id) ?? null;
  const others = serving?.filter((t) => t.station !== station?.id) ?? [];

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
      await updateDoc(queueDoc(shopId, queueId), { status });
    } catch (e) {
      setError(messageOf(e));
    }
  }

  return (
    <main className="serving">
      <PauseBanner status={q.status} />

      <header className="serving-header">
        <div>
          <h1>{q.name}</h1>
          <p className="muted">
            {station.label || 'Serving'} · {q.waitingCount} waiting
          </p>
        </div>
        <Link to="/shop" className="link">
          All queues
        </Link>
      </header>

      <section className="now-serving">
        {mine ? (
          <>
            <p className="label">Now serving</p>
            <p className="called-name">{mine.displayName}</p>
            <p className="called-station">{station.label}</p>
          </>
        ) : (
          <p className="called-name muted">
            {q.waitingCount > 0 ? 'Ready for the next customer' : 'Nobody waiting'}
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
          {mine ? 'Done — next' : 'Call next'}
        </button>
        <button
          type="button"
          className="secondary big-touch"
          disabled={busy || !mine}
          onClick={() => advance('noShow')}
        >
          Not here
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {others.length > 0 && (
        <section>
          <h2>Also serving</h2>
          <ul className="pairings">
            {others.map((t) => (
              <li key={t.id}>
                <strong>{t.displayName}</strong> — {t.station}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Waiting</h2>
        <UpcomingList
          shopId={shopId}
          queueId={queueId}
          waiting={waiting ?? []}
        />
      </section>

      <footer className="serve-footer">
        {q.status === 'paused' ? (
          <button type="button" onClick={() => void setStatus('open')}>
            Resume
          </button>
        ) : (
          <button
            type="button"
            className="secondary"
            disabled={q.status !== 'open'}
            onClick={() => void setStatus('paused')}
          >
            Pause
          </button>
        )}
        <button
          type="button"
          className="secondary"
          // Still available while draining: someone at the counter can be
          // added even once the queue is shut to remote joiners.
          disabled={q.status !== 'open' && q.status !== 'drainMode'}
          onClick={() => setShowWalkIn(true)}
        >
          Add walk-in
        </button>
        {q.status === 'closed' ? (
          <button type="button" onClick={() => void setStatus('open')}>
            Open queue
          </button>
        ) : (
          <button
            type="button"
            className="secondary"
            onClick={() => setShowClose(true)}
          >
            Close
          </button>
        )}
        <button
          type="button"
          className="secondary"
          onClick={() => setShowQr(true)}
        >
          Show QR
        </button>
        <button
          type="button"
          className="link"
          onClick={() => {
            rememberStation(queueId, null);
            setStation(null);
          }}
        >
          Change position
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
