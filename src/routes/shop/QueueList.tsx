import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { queuesOf, stationsOf } from '../../lib/firestore/queries.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { FreeServicesBar } from './components/FreeServicesBar.js';
import { SignedInAs } from './components/SignedInAs.js';
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
      {/* Shop settings, billing and signing out live in the ☰ menu in the
          app header (AppHeader), with the language switch. */}
      <header>
        <h1>{shopName}</h1>
        <SignedInAs shopId={shopId} isOwner={isOwner} />
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
              {/* The wall display, for this queue. The monitor needs both ids,
                  so it can only be linked from somewhere that knows them —
                  which is here, not a bare link in the footer. */}
              <LocalizedLink
                className="link"
                to={`/monitor?shop=${shopId}&queue=${q.id}`}
              >
                {t('shop.queueList.monitor')}
              </LocalizedLink>
              {isOwner && (
                <LocalizedLink
                  className="icon-link"
                  to={`/shop/q/${q.id}/settings`}
                  aria-label={t('shop.queueList.settings')}
                  title={t('shop.queueList.settings')}
                >
                  <GearIcon />
                </LocalizedLink>
              )}
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

/** The queue's settings, as a gear rather than the word. */
function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
