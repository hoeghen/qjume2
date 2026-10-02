import { useEffect } from 'react';
import { Logo } from '../components/Logo.js';
import { LocalizedLink, useLocalizedNavigate } from '../lib/i18n/LocalizedLink.js';
import { useT } from '../lib/i18n/LanguageContext.js';
import { YourQueues } from './customer/components/YourQueues.js';
import { ContinueFromSafari } from './customer/components/ContinueFromSafari.js';
import { forgetTicket, heldTickets } from '../lib/myTickets.js';
import { fetchTicket } from '../lib/firestore/queries.js';
import { isStandalone } from '../lib/platform.js';

/** Once per launch: coming back here via the logo must not bounce. */
let triedOpeningOnlyQueue = false;

/**
 * The installed app opens on this page. Someone who is in exactly one queue
 * opened it to see their place, not a search page — so take them there.
 *
 * Only in the installed app: in a browser tab, landing on `/` is something
 * someone chose. And only if they are still here when the answer comes back,
 * rather than yanking them off whatever they tapped in the meantime.
 */
function useOpenOnlyQueue(): void {
  const navigate = useLocalizedNavigate();

  useEffect(() => {
    if (triedOpeningOnlyQueue || !isStandalone()) return;
    triedOpeningOnlyQueue = true;
    const startedAt = window.location.pathname;
    void (async () => {
      const held = heldTickets();
      if (held.length === 0) return;
      const states = await Promise.all(
        held.map((h) =>
          fetchTicket(h.shopId, h.queueId, h.ticketId).catch(() => undefined),
        ),
      );
      const active = held.filter((h, i) => {
        const ticket = states[i];
        // A read that failed is unknown, not finished: leave it remembered.
        if (ticket === undefined) return false;
        const live = ticket?.state === 'waiting' || ticket?.state === 'serving';
        if (!live) forgetTicket(h.shopId, h.queueId);
        return live;
      });
      const only = active.length === 1 ? active[0] : undefined;
      if (only && window.location.pathname === startedAt) {
        navigate(`/q/${only.shopId}/${only.queueId}`, { replace: true });
      }
    })();
    // Runs once on arrival; `navigate` is a fresh function every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * The front door, built to the design canvas.
 *
 * Two audiences arrive at the same URL and want opposite things, so the page
 * has to answer "what is this" and "which of you are you" in one glance.
 * Joining is the common case and gets the button; running a shop is a decision
 * someone makes once, so it gets a line of text.
 */
export function Splash() {
  const { t } = useT();
  useOpenOnlyQueue();

  return (
    <section className="splash">
      <YourQueues />
      <ContinueFromSafari />

      <Logo size={44} />

      <h1 className="splash-wordmark">QjuMe</h1>

      <p className="splash-lede">{t('splash.lede')}</p>

      <QueueIllustration />

      <div className="splash-actions">
        <LocalizedLink className="button splash-primary" to="/find">
          {t('splash.join')}
        </LocalizedLink>
        <LocalizedLink className="splash-secondary" to="/shop">
          {t('splash.createLink')}
        </LocalizedLink>
      </div>

      {/* For the one platform admin, who would otherwise have to type the
          URL. Deliberately the faintest thing on the page: everyone else
          should look straight past it, and /admin refuses them anyway. */}
      <LocalizedLink className="splash-admin" to="/admin">
        {t('splash.admin')}
      </LocalizedLink>
    </section>
  );
}

/**
 * Four people on a dashed line, the one at the front picked out in orange.
 *
 * Decorative: it restates the lede rather than adding to it, so it is hidden
 * from screen readers instead of being given a description they would have to
 * listen through.
 */
function QueueIllustration() {
  return (
    <svg
      className="splash-queue"
      width="420"
      height="130"
      viewBox="0 0 420 130"
      aria-hidden="true"
      focusable="false"
    >
      <line
        x1="10"
        y1="112"
        x2="410"
        y2="112"
        stroke="oklch(0.3 0.02 255)"
        strokeWidth="1.5"
        strokeDasharray="3 5"
      />
      <g stroke="oklch(0.55 0.02 255)" strokeWidth="2" fill="none">
        {[60, 140, 220].map((x) => (
          <g key={x}>
            <circle cx={x} cy="40" r="13" />
            <path d={`M${x - 20} 100 v-20 a20 20 0 0 1 40 0 v20`} />
          </g>
        ))}
      </g>
      {/* Next to be called. */}
      <g stroke="oklch(0.62 0.19 38)" strokeWidth="2.5" fill="none">
        <circle cx="300" cy="38" r="14" />
        <path d="M278 100 v-21 a22 22 0 0 1 44 0 v21" />
      </g>
    </svg>
  );
}
