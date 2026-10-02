import type { Shop } from '../../../types/index.js';
import { SUBSCRIPTION_PRICE_DKK } from '../../../types/index.js';
import {
  freeServicesGranted,
  freeServicesRemaining,
} from '../../../lib/freeServices.js';
import { LocalizedLink } from '../../../lib/i18n/LocalizedLink.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';

/**
 * The free-services counter, where it is spent: on the serve screen.
 *
 * Quiet while there are plenty left, a warning once they are gone. Only the
 * owner gets the subscribe link — billing is theirs alone, and staff cannot
 * open that page. Nothing at all on a subscription, where the count no
 * longer limits anything. Never on the monitor screen, which customers see.
 */
export function FreeServicesBar({ shop, isOwner }: { shop: Shop; isOwner: boolean }) {
  const { t } = useT();
  if (shop.plan === 'paid') return null;

  const left = freeServicesRemaining(shop);
  const subscribe = isOwner ? (
    <LocalizedLink to="/shop/billing" className="link">
      {t('shop.freeServices.subscribe', { price: SUBSCRIPTION_PRICE_DKK })}
    </LocalizedLink>
  ) : null;

  if (left === 0) {
    return (
      <div className="notice warn free-services" role="status">
        <p>{t(isOwner ? 'shop.freeServices.usedUpOwner' : 'shop.freeServices.usedUpStaff')}</p>
        {subscribe}
      </div>
    );
  }

  return (
    <p className="free-services hint">
      {t('shop.freeServices.left', { left, of: freeServicesGranted(shop) })}
      {subscribe && <> · {subscribe}</>}
    </p>
  );
}
