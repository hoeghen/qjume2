import { useParams } from 'react-router-dom';
import { useCollection } from '../../lib/hooks/useFirestore.js';
import { queuesOf } from '../../lib/firestore/queries.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { QueueForm } from './QueueForm.js';
import { useShopContext } from './ShopHome.js';

export function QueueFormRoute() {
  const { t } = useT();
  const { shopId } = useShopContext();
  const { queueId } = useParams();
  const { data: queues, loading: queuesLoading } = useCollection(
    queuesOf(shopId),
    `${shopId}/queues`,
  );
  if (queuesLoading) return <p className="panel">{t('common.loading')}</p>;

  const soleQueue = (queues ?? []).every((q) => q.id === queueId);
  // A new queue at a shop that already has one is overwhelmingly likely to
  // sit at the same address — a fresh location per line would be the
  // unusual case, not the common one.
  const suggestedAddress = queueId
    ? undefined
    : queues?.find((q) => q.address)?.address;
  return (
    <QueueForm
      shopId={shopId}
      soleQueue={soleQueue}
      {...(suggestedAddress ? { suggestedAddress } : {})}
    />
  );
}
