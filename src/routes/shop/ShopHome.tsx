import { useEffect, useState } from 'react';
import { Outlet, useSearchParams, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth.js';
import { useCollection, useDoc } from '../../lib/hooks/useFirestore.js';
import { shopsOwnedBy } from '../../lib/firestore/queries.js';
import { shopDoc, shopOwnerDoc, staffMembershipDoc } from '../../lib/firestore/paths.js';
import { recordShopOwner } from '../../lib/firestore/writes.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { SignIn } from './SignIn.js';
import { CreateShop } from './CreateShop.js';
import { BusinessWelcome, choseCreate, rememberChoseCreate } from './BusinessWelcome.js';

export interface ShopContext {
  shopId: string;
  shopName: string;
  /** Staff can serve; only the owner can change settings, staff or billing. */
  isOwner: boolean;
}

export function useShopContext(): ShopContext {
  return useOutletContext<ShopContext>();
}

/**
 * Gate for everything under /shop: sign in, then find a shop, then the real
 * screens. Rendered as a layout route so the child screens can assume one.
 *
 * Two ways to have a shop: owning it, or being added as staff to someone
 * else's (see addStaff).
 *
 * Someone with no shop — signed in or not — first sees two choices (create a
 * shop, or watch the introduction) rather than a sign-in form out of nowhere. Both lookups run in parallel;
 * owning wins if somehow both are true, which shouldn't happen since
 * addStaff refuses to add an owner to their own shop.
 */
export function ShopHome() {
  const { t } = useT();
  const { user, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  // Past the two-choice welcome: chosen just now, chosen before signing in
  // (the magic link brings them back here), or arriving from the intro page.
  const [pastWelcome, setPastWelcome] = useState(() => {
    if (params.get('create') === '1') {
      rememberChoseCreate();
      return true;
    }
    return choseCreate();
  });
  const { data: ownedShops, loading: ownedLoading } = useCollection(
    user ? shopsOwnedBy(user.uid) : null,
    user ? `shops-of/${user.uid}` : 'no-user',
  );
  // staffMemberships/{uid} exists only because a collection-group query
  // can't answer "which shop is this uid staff at" under the security
  // rules — see StaffMembership's own comment.
  const membership = useDoc(user ? staffMembershipDoc(user.uid) : null);
  const staffShop = useDoc(
    membership.data ? shopDoc(membership.data.shopId) : null,
  );

  // Keep the owner's email beside the shop for the platform admin (ShopOwner):
  // fills in for shops that predate it, and follows a changed address.
  const ownedId = ownedShops?.[0]?.id ?? null;
  const ownerRecord = useDoc(ownedId ? shopOwnerDoc(ownedId) : null);
  const email = user && !user.isAnonymous ? user.email : null;
  useEffect(() => {
    if (!ownedId || !user || !email || ownerRecord.loading) return;
    const stored = ownerRecord.data;
    if (stored?.email === email && stored.uid === user.uid) return;
    void recordShopOwner(ownedId, { uid: user.uid, email }).catch(() => {
      // Best-effort: the admin shows the uid until a later visit succeeds.
    });
  }, [ownedId, user, email, ownerRecord.loading, ownerRecord.data]);

  if (authLoading) return <p className="panel">{t('common.loading')}</p>;
  // An anonymous customer is not a shop. Without this, someone who joined a
  // queue would land in the admin screens of whatever shop that uid owns.
  if (!user || user.isAnonymous) {
    if (!pastWelcome) {
      return (
        <BusinessWelcome
          onCreate={() => setPastWelcome(true)}
          onSignIn={() => setPastWelcome(true)}
        />
      );
    }
    return <SignIn />;
  }
  if (ownedLoading || membership.loading) {
    return <p className="panel">{t('common.loading')}</p>;
  }

  const owned = ownedShops?.[0];
  if (owned) {
    return (
      <Outlet
        context={{ shopId: owned.id, shopName: owned.name, isOwner: true }}
      />
    );
  }

  if (membership.data) {
    if (staffShop.loading) return <p className="panel">{t('common.loading')}</p>;
    if (staffShop.data) {
      return (
        <Outlet
          context={{
            shopId: membership.data.shopId,
            shopName: staffShop.data.name,
            isOwner: false,
          }}
        />
      );
    }
  }

  if (!pastWelcome) {
    return <BusinessWelcome onCreate={() => setPastWelcome(true)} />;
  }
  return <CreateShop ownerUid={user.uid} />;
}
