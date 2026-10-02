import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo.js';
import { detectLocaleFromPath, isLandingPath, withLocale } from '../lib/i18n/locale.js';

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
  // language switch alone — every page has a way into the other language.
  if (isLandingPath(pathname)) {
    return <header className="app-header app-header-landing">{languageSwitch}</header>;
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
