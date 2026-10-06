import { useDoc } from '../../lib/hooks/useFirestore.js';
import { shopDoc } from '../../lib/firestore/paths.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { ServingScreen } from './ServingScreen.js';
import { FreeServicesBar } from './components/FreeServicesBar.js';
import { SignedInAs } from './components/SignedInAs.js';
import { useShopContext } from './ShopHome.js';

export function ServingRoute() {
  const { t } = useT();
  const { shopId, isOwner } = useShopContext();
  const shop = useDoc(shopDoc(shopId));
  if (shop.loading) return <p className="panel">{t('common.loading')}</p>;
  return (
    <>
      {shop.data && <FreeServicesBar shop={shop.data} isOwner={isOwner} />}
      <ServingScreen
        shopId={shopId}
        signedInAs={<SignedInAs shopId={shopId} isOwner={isOwner} />}
      />
    </>
  );
}
