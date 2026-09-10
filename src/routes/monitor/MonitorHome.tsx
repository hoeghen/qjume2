import { useSearchParams } from 'react-router-dom';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { queueDoc } from '../../lib/firestore/paths.js';
import { servingTickets, stationsOf, waitingTickets } from '../../lib/firestore/queries.js';

const UPCOMING = 5;

/**
 * The screen on the wall.
 *
 * This is the only channel a manually-added walk-in has: no phone, no
 * notifications, just their name appearing here. It reads the public half of
 * each ticket and needs no sign-in, which is why that half exists.
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

  return (
    <main className="monitor">
      <h1>{queue.data.name}</h1>

      <section>
        <h2>Now serving</h2>
        {serving && serving.length > 0 ? (
          <ul className="pairings monitor-pairings">
            {serving.map((t) => (
              <li key={t.id}>
                <strong>{t.displayName}</strong>
                <span>{labelOf(t.station)}</span>
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
    </main>
  );
}
