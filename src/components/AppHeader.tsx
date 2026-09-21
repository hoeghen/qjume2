import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Logo.js';

/**
 * The way back to the front door, on every screen.
 *
 * Rendered by the app shell rather than by each screen, so a route added later
 * gets it without anyone remembering to. The mark and wordmark are one link,
 * which is where people already expect "home" to be.
 *
 * The splash is the exception: it is the landing page, and it carries the mark
 * at full size already.
 */
export function AppHeader() {
  const { pathname } = useLocation();
  if (pathname === '/') return null;

  return (
    <header className="app-header">
      <Link className="home-link" to="/">
        <Logo size={26} decorative />
        <span>QjuMe</span>
      </Link>
    </header>
  );
}
