import { QueueList } from './QueueList.js';
import { useShopContext } from './ShopHome.js';

export function ShopIndex() {
  const { shopId, shopName } = useShopContext();
  return <QueueList shopId={shopId} shopName={shopName} />;
}
