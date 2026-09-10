import { Outlet, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth.js';
import { useCollection } from '../../lib/hooks/useFirestore.js';
import { shopsOwnedBy } from '../../lib/firestore/queries.js';
import { SignIn } from './SignIn.js';
import { CreateShop } from './CreateShop.js';

export interface ShopContext {
  shopId: string;
  shopName: string;
}

export function useShopContext(): ShopContext {
  return useOutletContext<ShopContext>();
}

/**
 * Gate for everything under /shop: sign in, then set up a shop, then the real
 * screens. Rendered as a layout route so the child screens can assume a shop.
 */
export function ShopHome() {
  const { user, loading: authLoading } = useAuth();
  const { data: shops, loading: shopsLoading } = useCollection(
    user ? shopsOwnedBy(user.uid) : null,
    user ? `shops-of/${user.uid}` : 'no-user',
  );

  if (authLoading) return <p className="panel">Loading…</p>;
  if (!user) return <SignIn />;
  if (shopsLoading) return <p className="panel">Loading…</p>;

  const shop = shops?.[0];
  if (!shop) return <CreateShop ownerUid={user.uid} />;

  return <Outlet context={{ shopId: shop.id, shopName: shop.name }} />;
}
