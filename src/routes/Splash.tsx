import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo.js';

/**
 * The front door, built to the design canvas.
 *
 * Two audiences arrive at the same URL and want opposite things, so the page
 * has to answer "what is this" and "which of you are you" in one glance.
 * Joining is the common case and gets the button; running a shop is a decision
 * someone makes once, so it gets a line of text.
 */
export function Splash() {
  return (
    <section className="splash">
      <Logo size={44} />

      <h1 className="splash-wordmark">QjuMe</h1>

      <p className="splash-lede">
        See the wait before you go. Join any queue from anywhere — no login
        required.
      </p>

      <QueueIllustration />

      <div className="splash-actions">
        <Link className="button splash-primary" to="/find">
          Join a queue
        </Link>
        <Link className="splash-secondary" to="/shop">
          or create one for your business →
        </Link>
      </div>
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
