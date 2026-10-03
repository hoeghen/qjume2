import { useState, type FormEvent } from 'react';
import { useCollection } from '../../lib/hooks/useFirestore.js';
import { staffOf } from '../../lib/firestore/queries.js';
import { addStaff, messageOf, removeStaff } from '../../lib/functions.js';
import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';
import { RenameShop } from './components/RenameShop.js';
import { DeleteShopDialog } from './components/DeleteShopDialog.js';
import { useShopContext } from './ShopHome.js';

/**
 * The shop's own settings, owner only: its name, who may serve, and deleting
 * it. Staff used to live on the billing page, which made adding a colleague
 * look like a payment question; queue settings stay with each queue.
 */
export function ShopSettings() {
  const { t } = useT();
  const { shopId, shopName, isOwner } = useShopContext();
  const { data: staff } = useCollection(
    isOwner ? staffOf(shopId) : null,
    `${shopId}/staff`,
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  if (!isOwner) {
    return (
      <main className="panel">
        <p>{t('shop.settings.ownerOnly')}</p>
        <LocalizedLink to="/shop">{t('shop.settings.back')}</LocalizedLink>
      </main>
    );
  }

  function add(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    void addStaff({ shopId, name: name.trim(), email: email.trim() })
      .then(() => {
        setName('');
        setEmail('');
      })
      .catch((e: unknown) => setError(messageOf(e)))
      .finally(() => setBusy(false));
  }

  function remove(uid: string) {
    setBusy(true);
    setError(null);
    void removeStaff({ shopId, uid })
      .then(() => setConfirmRemove(null))
      .catch((e: unknown) => setError(messageOf(e)))
      .finally(() => setBusy(false));
  }

  return (
    <main className="panel">
      <p>
        <LocalizedLink className="link" to="/shop">
          {t('shop.settings.back')}
        </LocalizedLink>
      </p>
      <h1>{t('shop.settings.title')}</h1>

      <section className="stack">
        <RenameShop shopId={shopId} shopName={shopName} heading="h2" />
      </section>

      <section className="stack">
        <h2>{t('shop.settings.staffTitle')}</h2>
        <p className="hint">{t('shop.settings.staffHint')}</p>
        {staff && staff.length === 0 && <p className="muted">{t('shop.settings.noStaff')}</p>}
        <ul className="queue-list">
          {staff?.map((member) => {
            const label = member.name || member.email || member.id;
            return (
              <li key={member.id}>
                <div>
                  <strong>{label}</strong>
                  {member.name && member.email && <p className="muted">{member.email}</p>}
                </div>
                {confirmRemove === member.id ? (
                  <span className="row tight">
                    <span>{t('shop.settings.confirmRemove', { name: label })}</span>
                    <button
                      type="button"
                      className="danger"
                      disabled={busy}
                      onClick={() => remove(member.id)}
                    >
                      {t('shop.settings.remove')}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => setConfirmRemove(null)}
                    >
                      {t('common.cancel')}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="link danger"
                    disabled={busy}
                    aria-label={t('shop.settings.removeNamed', { name: label })}
                    onClick={() => setConfirmRemove(member.id)}
                  >
                    {t('shop.settings.remove')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <form onSubmit={add} className="stack">
          <h3>{t('shop.settings.addTitle')}</h3>
          <label htmlFor="staff-name">{t('shop.settings.nameLabel')}</label>
          <input
            id="staff-name"
            value={name}
            maxLength={40}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label htmlFor="staff-email">{t('shop.settings.emailLabel')}</label>
          <input
            id="staff-email"
            type="email"
            value={email}
            autoComplete="off"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p className="hint">{t('shop.settings.addHint')}</p>
          <button type="submit" disabled={busy}>
            {t('shop.settings.add')}
          </button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>

      <div className="danger-zone">
        <button type="button" className="link danger" onClick={() => setShowDelete(true)}>
          {t('shop.deleteShop.button')}
        </button>
      </div>

      {showDelete && (
        <DeleteShopDialog
          shopId={shopId}
          shopName={shopName}
          admin={false}
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            // ShopHome's own query falls through to CreateShop once the shop
            // is gone; nothing here needs to navigate.
          }}
        />
      )}
    </main>
  );
}
