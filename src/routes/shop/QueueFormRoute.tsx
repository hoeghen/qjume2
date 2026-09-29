import { useParams } from 'react-router-dom';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { shopDoc } from '../../lib/firestore/paths.js';
import { queuesOf } from '../../lib/firestore/queries.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { QueueForm } from './QueueForm.js';
import { useShopContext } from './ShopHome.js';

export function QueueFormRoute() {
  const { t } = useT();
  const { shopId } = useShopContext();
  const { queueId } = useParams();
  const shop = useDoc(shopDoc(shopId));
  const { data: queues, loading: queuesLoading } = useCollection(
    queuesOf(shopId),
    `${shopId}/queues`,
  );
  if (shop.loading || queuesLoading) return <p className="panel">{t('common.loading')}</p>;

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
      paid={shop.data?.plan === 'paid'}
      soleQueue={soleQueue}
      {...(suggestedAddress ? { suggestedAddress } : {})}
    />
  );
}
