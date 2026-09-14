import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * The front door.
 *
 * Two audiences arrive at the same URL and want opposite things, so the page
 * has to answer "what is this" and "which of you are you" in one glance.
 * Joining is the common case and gets the button; running a shop is a decision
 * someone makes once, so it gets a line of text instead.
 */

/** Long enough to read a change, short enough to see two without waiting. */
const ADVANCE_MS = 2400;
const START_AHEAD = 4;

export function Splash() {
  // The strip counts down to your turn and starts over. It is the product in
  // one picture: the line moves while you are somewhere else.
  const [ahead, setAhead] = useState(START_AHEAD);

  useEffect(() => {
    const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches;
    if (!motionOk) return;

    const id = window.setInterval(() => {
      setAhead((n) => (n <= 0 ? START_AHEAD : n - 1));
    }, ADVANCE_MS);
    return () => window.clearInterval(id);
  }, []);

  const isYourTurn = ahead === 0;

  return (
    <main className="splash">
      <div className="splash-brand">
        <p className="splash-eyebrow">Queues, without the queue</p>
        <h1 className="splash-wordmark">Qjume</h1>
      </div>

      <div className="splash-queue">
        <div
          className="splash-strip"
          // The strip is decoration for the caption below it, which carries
          // the same information as text.
          aria-hidden="true"
        >
          <span className="tile tile-serving">
            <span className="tile-label">Now serving</span>
          </span>

          {Array.from({ length: ahead }, (_, i) => (
            <span className="tile tile-waiting" key={i} />
          ))}

          <span className={`tile tile-you${isYourTurn ? ' tile-you-up' : ''}`}>
            <span className="tile-label">You</span>
          </span>
        </div>

        <p className="splash-status" role="status">
          {isYourTurn ? (
            <strong>You&rsquo;re up.</strong>
          ) : (
            <>
              <strong>{ahead} ahead of you</strong>
              <span className="muted"> &middot; about {ahead * 4} min</span>
            </>
          )}
        </p>
      </div>

      <p className="splash-lede">
        Join the line from wherever you are, and turn up when it is nearly your
        turn.
      </p>

      <div className="splash-actions">
        <Link className="button splash-primary" to="/find">
          Join a queue
        </Link>
        <p className="splash-secondary">
          Running a shop? <Link to="/shop">Create a queue</Link>
        </p>
      </div>
    </main>
  );
}
