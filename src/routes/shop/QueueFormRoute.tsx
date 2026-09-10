import { QueueForm } from './QueueForm.js';
import { useShopContext } from './ShopHome.js';

export function QueueFormRoute() {
  const { shopId } = useShopContext();
  return <QueueForm shopId={shopId} />;
}
