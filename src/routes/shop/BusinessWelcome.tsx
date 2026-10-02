import { LocalizedLink } from '../../lib/i18n/LocalizedLink.js';
import { useT } from '../../lib/i18n/LanguageContext.js';

/** Remembered on the device so the magic-link return lands on the form, not here. */
export const CHOSE_CREATE_KEY = 'qjume.choseCreateShop';

export function rememberChoseCreate(): void {
  try {
    window.localStorage.setItem(CHOSE_CREATE_KEY, '1');
  } catch {
    // Storage blocked: they see this choice once more after signing in.
  }
}

export function choseCreate(): boolean {
  try {
    return window.localStorage.getItem(CHOSE_CREATE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * What "I am a business" opens for someone with no shop: two ways forward,
 * not a sign-in form out of nowhere. Creating a shop goes on to sign-in (if
 * needed) and the create form; the video explains what Qjume is first.
 * Someone who already has a shop but is signed out gets a quiet way in.
 */
export function BusinessWelcome({
  onCreate,
  onSignIn,
}: {
  onCreate: () => void;
  /** Absent once signed in: there is nobody left to sign in. */
  onSignIn?: () => void;
}) {
  const { t } = useT();
  return (
    <main className="panel business-welcome">
      <h1>{t('shop.welcome.title')}</h1>
      <p className="muted">{t('shop.welcome.body')}</p>
      <div className="business-welcome-actions">
        <button
          type="button"
          onClick={() => {
            rememberChoseCreate();
            onCreate();
          }}
        >
          {t('shop.welcome.create')}
        </button>
        <LocalizedLink className="button secondary" to="/intro">
          {t('shop.welcome.video')}
        </LocalizedLink>
      </div>
      {onSignIn && (
        <button type="button" className="link business-welcome-signin" onClick={onSignIn}>
          {t('shop.welcome.signIn')}
        </button>
      )}
    </main>
  );
}
