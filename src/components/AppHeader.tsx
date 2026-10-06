import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo.js';
import {
  detectLocaleFromPath,
  isLandingPath,
  stripLocale,
  withLocale,
} from '../lib/i18n/locale.js';
import { useT } from '../lib/i18n/LanguageContext.js';
import { useAuth } from '../lib/hooks/useAuth.js';
import { useCollection } from '../lib/hooks/useFirestore.js';
import { shopsOwnedBy } from '../lib/firestore/queries.js';
import { signOut } from '../lib/auth.js';

/**
 * Each language's own name for itself. The switch shows the language you
 * would switch *to* — "English" on a Danish page, "Dansk" on an English one —
 * in that language, so someone who cannot read the current page can still
 * find their way out of it.
 */
const LANGUAGE_NAME = { da: 'Dansk', en: 'English' } as const;

/**
 * The way back to the front door, on every screen.
 *
 * Rendered by the app shell rather than by each screen, so a route added later
 * gets it without anyone remembering to. The mark and wordmark are one link,
 * which is where people already expect "home" to be.
 *
 * The splash is the exception: it is the landing page and carries the mark at
 * full size already, so on `/`, `/en` and `/da` only the language switch shows.
 */
export function AppHeader() {
  const { pathname, search, hash } = useLocation();
  const locale = detectLocaleFromPath(pathname);
  const otherLocale = locale === 'da' ? 'en' : 'da';
  const languageSwitch = (
    // Swaps language on the current page, not back to the front door - a
    // switch that changed what you were looking at would defeat the point
    // of switching mid-task. The query string comes along: the monitor's
    // `?shop=…&queue=…` is what it is showing.
    <Link
      className="language-switch"
      to={`${withLocale(pathname, otherLocale)}${search}${hash}`}
      lang={otherLocale}
    >
      {LANGUAGE_NAME[otherLocale]}
    </Link>
  );

  // The landing page carries the mark at full size already, so it gets the
  // menu alone: the language switch and the platform admin's way in, kept
  // out of the way of the two audiences the page is actually for.
  if (isLandingPath(pathname)) {
    return (
      <header className="app-header app-header-landing">
        <AppMenu>
          {languageSwitch}
          <Link to={withLocale('/admin', locale)}>Admin</Link>
          <SignOutItem />
        </AppMenu>
      </header>
    );
  }

  const home = (
    <Link className="home-link" to={withLocale('/', locale)}>
      <Logo size={26} decorative />
      <span>QjuMe</span>
    </Link>
  );

  // The shop's own pages gather language, the owner's settings and signing
  // out behind the same menu, instead of a row of links on each screen.
  if (stripLocale(pathname).startsWith('/shop')) {
    return (
      <header className="app-header">
        {home}
        <AppMenu>
          {languageSwitch}
          <ShopOwnerItems />
          <SignOutItem />
        </AppMenu>
      </header>
    );
  }

  return (
    <header className="app-header">
      {home}
      {languageSwitch}
    </header>
  );
}

/**
 * Shop settings and billing, for the shop's owner only. Asks the same query
 * the shop gate (`ShopHome`) already listens to, so it costs no extra read.
 */
function ShopOwnerItems() {
  const { t } = useT();
  const { pathname } = useLocation();
  const locale = detectLocaleFromPath(pathname);
  const { user } = useAuth();
  const signedIn = user && !user.isAnonymous;
  const { data: owned } = useCollection(
    signedIn ? shopsOwnedBy(user.uid) : null,
    signedIn ? `shops-of/${user.uid}` : 'no-user',
  );
  if (!owned || owned.length === 0) return null;
  return (
    <>
      <Link to={withLocale('/shop/settings', locale)}>{t('menu.shopSettings')}</Link>
      <Link to={withLocale('/shop/billing', locale)}>{t('menu.plan')}</Link>
    </>
  );
}

/**
 * "Log ud", with the address it signs out of beside it, so whoever holds
 * the device can see whose account it is. Only for a real sign-in: an
 * anonymous customer has nothing to sign out of.
 */
function SignOutItem() {
  const { t } = useT();
  const { user } = useAuth();
  if (!user || user.isAnonymous) return null;
  return (
    <button type="button" className="app-menu-signout" onClick={() => void signOut()}>
      <span>{t('menu.signOut')}</span>
      {user.email && <span className="app-menu-email">{user.email}</span>}
    </button>
  );
}

/**
 * A muted three-line icon that opens a small menu. Closes on a second tap, a
 * tap anywhere else, Escape, or following one of its links.
 */
function AppMenu({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="app-menu" ref={root}>
      <button
        type="button"
        className="app-menu-button"
        aria-label={t('menu.label')}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <nav className="app-menu-panel" onClick={() => setOpen(false)}>
          {children}
        </nav>
      )}
    </div>
  );
}
