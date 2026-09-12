import { ServingScreen } from './ServingScreen.js';
import { useShopContext } from './ShopHome.js';

export function ServingRoute() {
  const { shopId } = useShopContext();
  return <ServingScreen shopId={shopId} />;
}
