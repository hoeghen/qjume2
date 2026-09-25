/**
 * A small, easy-to-miss build marker at the foot of every screen. Its only
 * job is telling two open tabs (or a bug report) apart - not a stamp anyone
 * is meant to read on purpose.
 */
export function BuildVersion() {
  return <footer className="build-version">{import.meta.env.VITE_BUILD_VERSION}</footer>;
}
