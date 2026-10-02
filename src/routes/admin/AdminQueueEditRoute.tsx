import { useNavigate, useParams } from 'react-router-dom';
import { useCollection } from '../../lib/hooks/useFirestore.js';
import { queuesOf } from '../../lib/firestore/queries.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { QueueForm } from '../shop/QueueForm.js';

/**
 * The owner's own queue-settings form, reused: `admin` swaps `updateQueue`
 * for `adminUpdateQueue` (which skips the owner check) and sends "Save" and
 * "Cancel" back to this shop's admin page instead of `/shop`.
 */
export function AdminQueueEditRoute() {
  const { t } = useT();
  const { shopId = '', queueId } = useParams();
  const navigate = useNavigate();
  const { data: queues, loading } = useCollection(
    queuesOf(shopId),
    `admin/${shopId}/queues`,
  );
  if (loading) return <p className="panel">{t('common.loading')}</p>;

  const soleQueue = (queues ?? []).every((q) => q.id === queueId);
  return (
    <QueueForm
      shopId={shopId}
      admin
      soleQueue={soleQueue}
      onDone={() => navigate(`/admin/shops/${shopId}`)}
    />
  );
}
