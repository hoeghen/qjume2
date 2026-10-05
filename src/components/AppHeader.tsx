import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo.js';
import { detectLocaleFromPath, isLandingPath, withLocale } from '../lib/i18n/locale.js';
import { useT } from '../lib/i18n/LanguageContext.js';

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

  // The landing page carries the mark at full size already, so it gets a
  // quiet menu instead: the language switch and the platform admin's way in,
  // kept out of the way of the two audiences the page is actually for.
  if (isLandingPath(pathname)) {
    return (
      <header className="app-header app-header-landing">
        <LandingMenu>
          {languageSwitch}
          <Link className="landing-menu-item" to={withLocale('/admin', locale)}>
            Admin
          </Link>
        </LandingMenu>
      </header>
    );
  }

  return (
    <header className="app-header">
      <Link className="home-link" to={withLocale('/', locale)}>
        <Logo size={26} decorative />
        <span>QjuMe</span>
      </Link>
      {languageSwitch}
    </header>
  );
}

/**
 * A muted three-line icon that opens a small menu. Closes on a second tap, a
 * tap anywhere else, Escape, or following one of its links.
 */
function LandingMenu({ children }: { children: ReactNode }) {
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
    <div className="landing-menu" ref={root}>
      <button
        type="button"
        className="landing-menu-button"
        aria-label={t('splash.menu')}
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
        <nav className="landing-menu-panel" onClick={() => setOpen(false)}>
          {children}
        </nav>
      )}
    </div>
  );
}
