import { useSearchParams } from 'react-router-dom';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { queueDoc } from '../../lib/firestore/paths.js';
import { servingTickets, stationsOf, waitingTickets } from '../../lib/firestore/queries.js';
import { JoinQr } from '../../components/JoinQr.js';
import { counterJoinUrl } from '../../lib/url.js';
import type { QueueStatus } from '../../types/index.js';

const UPCOMING = 5;

/**
 * Why a scan is allowed while a remote join is not.
 *
 * `drainMode` has stopped taking remote joiners, but this screen hangs on the
 * wall: whoever is scanning it is standing in the shop, which is the same
 * person staff would add by hand. Anything further down — paused, closed, or
 * the heartbeat gone — takes nobody, and the panel says so rather than showing
 * a code that leads to a refusal.
 */
const SCANNABLE: QueueStatus[] = ['open', 'drainMode'];

const CLOSED_TO_JOINERS: Partial<Record<QueueStatus, string>> = {
  paused: 'Joining is paused right now.',
  unavailable: 'Not taking new joiners at the moment.',
  closed: 'This queue is closed.',
};

/**
 * The screen on the wall.
 *
 * This is the only channel a manually-added walk-in has: no phone, no
 * notifications, just their name appearing here. It reads the public half of
 * each ticket and needs no sign-in, which is why that half exists.
 *
 * It is also how someone joins without going to the counter: the join code
 * sits beside the live list, so the screen that tells you the wait is the
 * screen that puts you in the line.
 */
export function MonitorHome() {
  const [params] = useSearchParams();
  const shopId = params.get('shop') ?? '';
  const queueId = params.get('queue') ?? '';
  const ready = Boolean(shopId && queueId);

  const queue = useDoc(ready ? queueDoc(shopId, queueId) : null);
  const { data: stations } = useCollection(
    ready ? stationsOf(shopId, queueId) : null,
    `${shopId}/${queueId}/monitor-stations`,
  );
  const { data: serving } = useCollection(
    ready ? servingTickets(shopId, queueId) : null,
    `${shopId}/${queueId}/monitor-serving`,
  );
  const { data: waiting } = useCollection(
    ready ? waitingTickets(shopId, queueId, UPCOMING) : null,
    `${shopId}/${queueId}/monitor-waiting`,
  );

  if (!ready) {
    return (
      <main>
        <h1>In-shop monitor</h1>
        <p className="muted">
          Open this with a queue, for example{' '}
          <code className="code">/monitor?shop=SHOP&amp;queue=QUEUE</code>. The
          Show QR button on the serving screen has the ids.
        </p>
      </main>
    );
  }

  if (queue.loading) return <p>Loading…</p>;
  if (!queue.data) return <p>Queue not found.</p>;

  const labelOf = (stationId: string | null) =>
    stations?.find((s) => s.id === stationId)?.label ?? '';
  // One counter needs no name — "Till 1" only tells you something when there
  // is a Till 2 to tell it apart from.
  const manyTills = (stations?.length ?? 1) > 1;

  const status = queue.data.status;
  const scannable = SCANNABLE.includes(status);

  return (
    <main className="monitor screen">
      <h1>{queue.data.name}</h1>

      <div className="monitor-split">
        <div className="monitor-live">
          <section>
            <h2>Now serving</h2>
            {serving && serving.length > 0 ? (
              <ul className="pairings monitor-pairings">
                {serving.map((t) => (
                  <li key={t.id}>
                    <strong>{t.displayName}</strong>
                    {manyTills && <span>{labelOf(t.station)}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nobody is being served right now.</p>
            )}
          </section>

          <section>
            <h2>Coming up</h2>
            {waiting && waiting.length > 0 ? (
              <ol className="monitor-upcoming">
                {waiting.map((t) => (
                  <li key={t.id}>{t.displayName}</li>
                ))}
              </ol>
            ) : (
              <p className="muted">Nobody waiting.</p>
            )}
          </section>
        </div>

        <aside className="monitor-join">
          <h2>Scan to join</h2>
          {scannable ? (
            <>
              <div className="monitor-qr-card">
                <JoinQr
                  url={counterJoinUrl(shopId, queueId)}
                  className="monitor-qr"
                />
              </div>
              <p className="monitor-join-hint">
                Point your camera at the code. You keep your place on your own
                phone and we tell you when you are near the front.
              </p>
            </>
          ) : (
            <p className="monitor-join-hint">
              {CLOSED_TO_JOINERS[status] ?? 'Not taking new joiners.'}
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
