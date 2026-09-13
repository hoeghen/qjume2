import { isDemo } from '../lib/demo/mode.js';

/**
 * Says plainly that nothing here is real.
 *
 * The demo looks and behaves exactly like the app, which is the point — and
 * the reason it has to announce itself. Someone should not join a queue at a
 * pharmacy that does not exist and then travel there.
 */
export function DemoBanner() {
  if (!isDemo) return null;

  return (
    <p className="demo-banner" role="note">
      <strong>Demo.</strong> The shops are invented, everything lives in this
      tab, and a refresh starts it over. No account, no server, nothing saved.
    </p>
  );
}
