import { useDoc } from '../../lib/hooks/useFirestore.js';
import { shopDoc } from '../../lib/firestore/paths.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { ServingScreen } from './ServingScreen.js';
import { useShopContext } from './ShopHome.js';

export function ServingRoute() {
  const { t } = useT();
  const { shopId } = useShopContext();
  const shop = useDoc(shopDoc(shopId));
  if (shop.loading) return <p className="panel">{t('common.loading')}</p>;
  return <ServingScreen shopId={shopId} paid={shop.data?.plan === 'paid'} />;
}
