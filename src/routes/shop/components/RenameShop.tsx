import { useState, type FormEvent } from 'react';
import { messageOf, renameShop } from '../../../lib/functions.js';
import { useT } from '../../../lib/i18n/LanguageContext.js';

/**
 * The shop's name as a heading, with a quiet way to change it.
 *
 * Goes through `renameShop` rather than a direct write: the name is copied
 * onto every queue for discovery, and only the function changes them all
 * at once. The heading itself updates from the shop doc when it lands.
 */
export function RenameShop({
  shopId,
  shopName,
  heading: Heading = 'h1',
}: {
  shopId: string;
  shopName: string;
  /** The level the name is shown at; a section of a page uses h2. */
  heading?: 'h1' | 'h2';
}) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(shopName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="rename-shop">
        <Heading>{shopName}</Heading>
        <button
          type="button"
          className="link"
          onClick={() => {
            setName(shopName);
            setError(null);
            setEditing(true);
          }}
        >
          {t('shop.renameShop.rename')}
        </button>
      </div>
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === shopName) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setError(null);
    void renameShop({ shopId, name: trimmed })
      .then(() => setEditing(false))
      .catch((e: unknown) => setError(messageOf(e)))
      .finally(() => setBusy(false));
  }

  return (
    <form className="rename-shop stack" onSubmit={onSubmit}>
      <label htmlFor="rename-shop">{t('shop.renameShop.label')}</label>
      <input
        id="rename-shop"
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        required
      />
      <div className="row tight">
        <button type="submit" disabled={busy}>
          {t('shop.renameShop.save')}
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={() => setEditing(false)}>
          {t('shop.renameShop.cancel')}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
