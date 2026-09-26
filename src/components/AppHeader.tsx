import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo.js';
import { withLocale } from '../lib/i18n/locale.js';

/** What to call the *other* language, in that language - never in the one currently showing. */
const OTHER_LANGUAGE_LABEL = { en: 'Dansk', da: 'English' } as const;

/**
 * The way back to the front door, on every screen.
 *
 * Rendered by the app shell rather than by each screen, so a route added later
 * gets it without anyone remembering to. The mark and wordmark are one link,
 * which is where people already expect "home" to be.
 *
 * The splash is the exception: it is the landing page, and it carries the mark
 * at full size already. Checked directly against the URL, not the resolved
 * locale, since it must hide on both `/` and `/da`.
 */
export function AppHeader() {
  const { pathname } = useLocation();
  if (pathname === '/' || pathname === '/da') return null;

  const isDanish = pathname === '/da' || pathname.startsWith('/da/');
  const otherLocale = isDanish ? 'en' : 'da';

  return (
    <header className="app-header">
      <Link className="home-link" to={withLocale('/', isDanish ? 'da' : 'en')}>
        <Logo size={26} decorative />
        <span>QjuMe</span>
      </Link>
      {/* Swaps language on the current page, not back to the front door - a
          switch that changed what you were looking at would defeat the point
          of switching mid-task. */}
      <Link className="language-switch" to={withLocale(pathname, otherLocale)}>
        {OTHER_LANGUAGE_LABEL[otherLocale]}
      </Link>
    </header>
  );
}
