import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/hooks/useAuth.js';
import { pageName } from '../lib/pageNames.js';

/**
 * Which screen this is, by its short internal name (src/lib/pageNames.ts) —
 * platform-admin only, so there is an unambiguous way to say "which page"
 * without a screenshot or a guess at what the other person calls it.
 */
export function PageNameBadge() {
  const { isPlatformAdmin } = useAuth();
  const { pathname } = useLocation();
  if (!isPlatformAdmin) return null;
  return <div className="page-name-badge">{pageName(pathname)}</div>;
}
