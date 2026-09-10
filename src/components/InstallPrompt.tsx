import { isStandalone, isIos } from '../lib/platform.js';

/**
 * iOS only delivers web push to a PWA installed via Add to Home Screen, so an
 * iOS customer browsing in a Safari tab needs to install before the permission
 * prompt means anything. Nothing here asks for permission — that must come from
 * a user gesture, later, and only once installed. See CLAUDE.md.
 *
 * This is a guide, not a gate: a customer who never installs must still be able
 * to join a queue and watch their position live.
 */
export function InstallPrompt() {
  if (!isIos() || isStandalone()) return null;

  return (
    <aside className="install-prompt">
      <p>
        Add Qjume to your Home Screen to get notified when your turn is close.
        Tap Share, then <strong>Add to Home Screen</strong>.
      </p>
    </aside>
  );
}
