import { useCollection } from '../../lib/hooks/useFirestore.js';
import { queuesOf } from '../../lib/firestore/queries.js';
import { signOut } from '../../lib/auth.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';

export function QueueList({
  shopId,
  shopName,
}: {
  shopId: string;
  shopName: string;
}) {
  const { t } = useT();
  const { data: queues, loading } = useCollection(
    queuesOf(shopId),
    `${shopId}/queues`,
  );

  return (
    <main className="panel">
      <header className="serving-header">
        <h1>{shopName}</h1>
        <span className="row tight">
          <LocalizedLink className="link" to="/shop/billing">
            {t('shop.queueList.plan')}
          </LocalizedLink>
          <button type="button" className="link" onClick={() => void signOut()}>
            {t('shop.queueList.signOut')}
          </button>
        </span>
      </header>

      {loading && <p>{t('common.loading')}</p>}

      {!loading && queues?.length === 0 && (
        <p className="muted">{t('shop.queueList.noQueues')}</p>
      )}

      <ul className="queue-list">
        {queues?.map((q) => (
          <li key={q.id}>
            <div>
              <strong>{q.name}</strong>
              <span className={`badge status-${q.status}`}>
                {t(`shopQueueStatus.${q.status}`)}
              </span>
              <p className="muted">
                {t('shop.queueList.waitingAddress', { count: q.waitingCount, address: q.address })}
              </p>
            </div>
            <span className="row tight">
              <LocalizedLink className="button" to={`/shop/q/${q.id}/serve`}>
                {t('shop.queueList.serve')}
              </LocalizedLink>
              <LocalizedLink className="link" to={`/shop/q/${q.id}/settings`}>
                {t('shop.queueList.settings')}
              </LocalizedLink>
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

      <LocalizedLink className="button" to="/shop/q/new">
        {t('shop.queueList.newQueue')}
      </LocalizedLink>
    </main>
  );
}
