/**
 * The mark: two circles on a diagonal, one waiting and one called.
 *
 * Sized by its container rather than fixed, because the design uses it at
 * 30px in a screen header and 44px on the splash.
 */
export function Logo({ size = 30 }: { size?: number }) {
  // The dots and their inset scale with the mark so it holds its proportions.
  const dot = Math.round(size * 0.36);
  const inset = Math.round(size * 0.18);

  return (
    <span
      className="logo"
      style={{ width: size, height: size }}
      role="img"
      aria-label="QjuMe"
    >
      <span
        className="logo-dot logo-dot-waiting"
        style={{ width: dot, height: dot, left: inset, top: inset + 2 }}
      />
      <span
        className="logo-dot logo-dot-called"
        style={{ width: dot, height: dot, right: inset, bottom: inset + 2 }}
      />
    </span>
  );
}
