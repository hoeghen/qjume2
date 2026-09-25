const REPO_URL = 'https://github.com/hoeghen/qjume2';

/**
 * A small, easy-to-miss build marker at the foot of every screen. Its only
 * job is telling two open tabs (or a bug report) apart - not a stamp anyone
 * is meant to read on purpose. Links to the commit it was built from so
 * "what changed" is one tap away; a fallback build (no git history to read
 * the SHA from) has no commit to link to, so it renders as plain text.
 */
export function BuildVersion() {
  const version = import.meta.env.VITE_BUILD_VERSION;
  if (version === 'dev') return <footer className="build-version">{version}</footer>;

  return (
    <footer className="build-version">
      <a href={`${REPO_URL}/commit/${version}`} target="_blank" rel="noopener noreferrer">
        {version}
      </a>
    </footer>
  );
}
