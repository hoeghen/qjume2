import { useEffect, useState } from 'react';
import { useT } from '../lib/i18n/LanguageContext.js';

const REPO_URL = 'https://github.com/hoeghen/qjume2';
const BUILD_TIME = new Date(import.meta.env.VITE_BUILD_TIME).getTime();

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Which build is live, and how long it's been that way - admin-only
 * diagnostics, not something a customer or shop owner has a reason to see.
 * Links to the commit it was built from so "what changed" is one tap away;
 * a fallback build (no git history to read a SHA from) has no commit to
 * link to, so the version renders as plain text.
 *
 * "Alive for" counts from this bundle's own build time, ticking in the
 * browser - not a server uptime, since a static site has no server process
 * to ask. It resets the moment a new build actually reaches this tab.
 */
export function BuildInfo() {
  const { t } = useT();
  const version = import.meta.env.VITE_BUILD_VERSION;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const alive = Number.isNaN(BUILD_TIME) ? null : formatDuration(now - BUILD_TIME);

  return (
    <footer className="build-info">
      {version === 'dev' ? (
        version
      ) : (
        <a href={`${REPO_URL}/commit/${version}`} target="_blank" rel="noopener noreferrer">
          {version}
        </a>
      )}
      {alive && <>{t('admin.buildInfo.aliveFor', { duration: alive })}</>}
    </footer>
  );
}
