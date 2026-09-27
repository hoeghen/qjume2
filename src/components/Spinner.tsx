/**
 * A small inline spinner for "this is working" text — "Finding queues near
 * you…", "Updating…" — that otherwise looks identical whether the app is
 * fetching or has quietly stalled. `currentColor` picks up whatever text
 * colour it's dropped next to, so it never needs its own colour token on
 * either surface (CLAUDE.md: ink page text vs. a card's own foreground).
 *
 * Decorative, not a status announcement on its own — it always sits beside
 * text that says what's loading, so a screen reader only needs to hear that.
 */
export function Spinner() {
  return (
    <svg
      className="spinner"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}
