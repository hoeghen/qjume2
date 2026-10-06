import { useAuth } from '../../../lib/hooks/useAuth.js';
import { useDoc } from '../../../lib/hooks/useFirestore.js';
import { staffDoc } from '../../../lib/firestore/paths.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';

/**
 * Who is signed in on this device — the name the owner gave them when adding
 * them as staff, so a shared counter device shows whose account it is. The
 * owner has no staff record, and a member added before names existed has
 * none, so both fall back to the email.
 */
export function SignedInAs({ shopId, isOwner }: { shopId: string; isOwner: boolean }) {
  const { t } = useT();
  const { user } = useAuth();
  const member = useDoc(user && !isOwner ? staffDoc(shopId, user.uid) : null);
  if (!user || user.isAnonymous) return null;
  const name = member.data?.name?.trim() || user.email;
  if (!name) return null;
  return (
    <p className="muted signed-in-as">
      {t(isOwner ? 'menu.signedInAsOwner' : 'menu.signedInAs', { name })}
    </p>
  );
}
