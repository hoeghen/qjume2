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
 * Shown on the shop's own pages only — the shop overview and the serve
 * screen — never on anything a customer sees, the monitor included. On a
 * subscription the count limits nothing, so it is not shown: only that the
 * subscription is active. On the free plan, "156 of 1000 left". A warning
 * once a free shop has used them all. Only the owner gets the subscribe
 * link: billing is theirs alone, and staff cannot open that page.
 */
export function FreeServicesBar({ shop, isOwner }: { shop: Shop; isOwner: boolean }) {
  const { t } = useT();
  if (shop.plan === 'paid') {
    return (
      <p className="free-services plan-active-badge">
        <span aria-hidden="true">✓</span> {t('shop.freeServices.subscribed')}
      </p>
    );
  }

  const left = freeServicesRemaining(shop);
  const counter = t('shop.freeServices.left', { left, of: freeServicesGranted(shop) });

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
      {counter}
      {subscribe && <> · {subscribe}</>}
    </p>
  );
}
