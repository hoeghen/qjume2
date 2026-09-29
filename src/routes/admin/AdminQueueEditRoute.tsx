import { useNavigate, useParams } from 'react-router-dom';
import { useCollection } from '../../lib/hooks/useFirestore.js';
import { queuesOf } from '../../lib/firestore/queries.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { QueueForm } from '../shop/QueueForm.js';

/**
 * The owner's own queue-settings form, reused: `admin` swaps `updateQueue`
 * for `adminUpdateQueue` (which skips the owner check) and sends "Save" and
 * "Cancel" back to this shop's admin page instead of `/shop`. `paid` is
 * forced true so the description field isn't blocked behind a plan an admin
 * doing support work has no reason to care about.
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
      paid={true}
      admin
      soleQueue={soleQueue}
      onDone={() => navigate(`/admin/shops/${shopId}`)}
    />
  );
}
