import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { queuesOf, stationsOf } from '../../lib/firestore/queries.js';
import { signOut } from '../../lib/auth.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { FreeServicesBar } from './components/FreeServicesBar.js';
import { shopDoc } from '../../lib/firestore/paths.js';

export function QueueList({
  shopId,
  shopName,
  isOwner,
}: {
  shopId: string;
  shopName: string;
  /** Staff can serve; settings, billing and deleting the shop stay owner-only. */
  isOwner: boolean;
}) {
  const { t } = useT();
  const { data: queues, loading } = useCollection(
    queuesOf(shopId),
    `${shopId}/queues`,
  );
  const shop = useDoc(shopDoc(shopId));

  return (
    <main className="panel">
      <header className="serving-header">
        <h1>{shopName}</h1>
        <span className="row tight">
          {isOwner && (
            <LocalizedLink className="link" to="/shop/settings">
              {t('shop.queueList.shopSettings')}
            </LocalizedLink>
          )}
          {isOwner && (
            <LocalizedLink className="link" to="/shop/billing">
              {t('shop.queueList.plan')}
            </LocalizedLink>
          )}
          <button type="button" className="link" onClick={() => void signOut()}>
            {t('shop.queueList.signOut')}
          </button>
        </span>
      </header>

      {shop.data && <FreeServicesBar shop={shop.data} isOwner={isOwner} />}

      {loading && <p>{t('common.loading')}</p>}

      {!loading && queues?.length === 0 && (
        <p className="muted">{t('shop.queueList.noQueues')}</p>
      )}

      <ul className="queue-list">
        {queues?.map((q) => (
          <li key={q.id}>
            <div>
              {q.name && <strong>{q.name}</strong>}
              <span className={`badge status-${q.status}`}>
                {t(`shopQueueStatus.${q.status}`)}
              </span>
              <p className="muted">
                {t('shop.queueList.waitingAddress', { count: q.waitingCount, address: q.address })}
              </p>
              <TillCount shopId={shopId} queueId={q.id} />
            </div>
            <span className="row tight">
              <LocalizedLink className="button" to={`/shop/q/${q.id}/serve`}>
                {t('shop.queueList.serve')}
              </LocalizedLink>
              {isOwner && (
                <LocalizedLink className="link" to={`/shop/q/${q.id}/settings`}>
                  {t('shop.queueList.settings')}
                </LocalizedLink>
              )}
              {/* The wall display, for this queue. The monitor needs both ids,
                  so it can only be linked from somewhere that knows them —
                  which is here, not a bare link in the footer. */}
              <LocalizedLink
                className="link"
                to={`/monitor?shop=${shopId}&queue=${q.id}`}
              >
                {t('shop.queueList.monitor')}
              </LocalizedLink>
            </span>
          </li>
        ))}
      </ul>

      {isOwner && (
        <LocalizedLink className="button" to="/shop/q/new">
          {t('shop.queueList.newQueue')}
        </LocalizedLink>
      )}

    </main>
  );
}

/**
 * How many tills a queue has and how many are open — "open" meaning serving
 * now, the same count the wait estimate divides by. A queue with no tills
 * says so, since nobody can serve it until one is opened.
 */
function TillCount({ shopId, queueId }: { shopId: string; queueId: string }) {
  const { t, tn } = useT();
  const { data: stations } = useCollection(
    stationsOf(shopId, queueId),
    `${shopId}/${queueId}/till-count`,
  );
  if (!stations) return null;
  const open = stations.filter((s) => s.serving).length;
  return (
    <p className="muted">
      {stations.length === 0
        ? t('shop.queueList.noTills')
        : stations.length === 1
          ? tn(1, 'shop.queueList.tills')
          : `${tn(stations.length, 'shop.queueList.tills')} · ${tn(open, 'shop.queueList.openTills')}`}
    </p>
  );
}
