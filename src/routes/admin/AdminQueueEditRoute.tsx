import { useNavigate, useParams } from 'react-router-dom';
import { QueueForm } from '../shop/QueueForm.js';

/**
 * The owner's own queue-settings form, reused: `admin` swaps `updateQueue`
 * for `adminUpdateQueue` (which skips the owner check) and sends "Save" and
 * "Cancel" back to this shop's admin page instead of `/shop`. `paid` is
 * forced true so the description field isn't blocked behind a plan an admin
 * doing support work has no reason to care about.
 */
export function AdminQueueEditRoute() {
  const { shopId = '' } = useParams();
  const navigate = useNavigate();
  return (
    <QueueForm
      shopId={shopId}
      paid={true}
      admin
      onDone={() => navigate(`/admin/shops/${shopId}`)}
    />
  );
}
