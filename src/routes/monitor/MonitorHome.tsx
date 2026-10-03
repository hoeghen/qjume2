import { useSearchParams } from 'react-router-dom';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { serviceTimeSeconds } from '../../lib/queue/waitTime.js';
import { queueDoc } from '../../lib/firestore/paths.js';
import { servingTickets, stationsOf, waitingTickets } from '../../lib/firestore/queries.js';
import { JoinQr } from '../../components/JoinQr.js';
import { counterJoinUrl } from '../../lib/url.js';
import { formatWaitCompact } from '../../lib/format.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { tillLabel } from '../../lib/tills.js';
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

const CLOSED_TO_JOINERS_KEYS: Partial<Record<QueueStatus, string>> = {
  paused: 'status.closedToJoiners.paused',
  unavailable: 'status.closedToJoiners.unavailable',
  closed: 'status.closedToJoiners.closed',
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
  const { t, locale } = useT();
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
        <h1>{t('monitor.helpTitle')}</h1>
        <p className="muted">
          {t('monitor.helpBefore')}
          <code className="code">/monitor?shop=SHOP&amp;queue=QUEUE</code>
          {t('monitor.helpAfter')}
        </p>
      </main>
    );
  }

  if (queue.loading) return <p>{t('common.loading')}</p>;
  if (!queue.data) return <p>{t('monitor.notFound')}</p>;

  // One counter needs no name — "Kasse 1" only tells you something when
  // there is a Kasse 2 to tell it apart from. With several, every till gets a
  // tile, staffed or not, so the room can see where to go and which are shut.
  const manyTills = (stations?.length ?? 1) > 1;
  const tills = [...(stations ?? [])]
    .map((s) => ({ ...s, name: tillLabel(s.label, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale, { numeric: true }));

  const status = queue.data.status;
  const scannable = SCANNABLE.includes(status);
  const closedReasonKey = CLOSED_TO_JOINERS_KEYS[status];
  // The owner's own estimate until real completions replace it — the same
  // figure every wait estimate is built from.
  const serviceTime = serviceTimeSeconds(queue.data);

  return (
    <main className="monitor screen">
      <h1>{queue.data.name || queue.data.shopName}</h1>
      <p className="monitor-stats">
        {t('monitor.waitingCount', { count: queue.data.waitingCount })}
        {' · '}
        {t('monitor.avgServiceTime', { time: formatWaitCompact(serviceTime, t) })}
      </p>

      <div className="monitor-split">
        <div className="monitor-live">
          <section>
            <h2>{t(manyTills ? 'monitor.tills' : 'monitor.nowServing')}</h2>
            {manyTills ? (
              <ul className="pairings monitor-pairings monitor-tills">
                {tills.map((till) => {
                  // Whoever is at the till wins over its flag: staff can stop
                  // serving with a customer still in front of them.
                  const here = serving?.find((ticket) => ticket.station === till.id);
                  const state = here ? 'busy' : till.serving ? 'ready' : 'closed';
                  return (
                    <li key={till.id} className={`till-${state}`}>
                      <span>{till.name}</span>
                      <strong>
                        {here
                          ? here.displayName
                          : t(till.serving ? 'monitor.tillReady' : 'monitor.tillClosed')}
                      </strong>
                    </li>
                  );
                })}
              </ul>
            ) : serving && serving.length > 0 ? (
              <ul className="pairings monitor-pairings">
                {serving.map((ticket) => (
                  <li key={ticket.id}>
                    <strong>{ticket.displayName}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{t('monitor.nobodyServed')}</p>
            )}
          </section>

          <section>
            <h2>{t('monitor.comingUp')}</h2>
            {waiting && waiting.length > 0 ? (
              <ol className="monitor-upcoming">
                {waiting.map((ticket) => (
                  <li key={ticket.id}>{ticket.displayName}</li>
                ))}
              </ol>
            ) : (
              <p className="muted">{t('monitor.nobodyWaiting')}</p>
            )}
          </section>
        </div>

        <aside className="monitor-join">
          <h2>{t('monitor.scanToJoin')}</h2>
          {scannable ? (
            <>
              <div className="monitor-qr-card">
                <JoinQr
                  url={counterJoinUrl(shopId, queueId)}
                  className="monitor-qr"
                />
              </div>
              <p className="monitor-join-hint">{t('monitor.scanHint')}</p>
            </>
          ) : (
            <p className="monitor-join-hint">
              {closedReasonKey ? t(closedReasonKey) : t('status.closedToJoiners.default')}
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
