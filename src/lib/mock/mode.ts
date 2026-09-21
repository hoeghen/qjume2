/**
 * Which backend this build talks to.
 *
 * Qjume ships with two interchangeable backends behind the same data layer:
 * Firebase, and a complete in-browser implementation in `src/lib/mock/`. The
 * mock is not a stripped-down preview — it implements every callable and the
 * same queue ordering, so the app above it is the app, not a demo of it.
 *
 * The choice is made at build time, which means the unused one is tree-shaken
 * away: a Firebase build carries no seed data, and a mock build carries no
 * Firebase SDK.
 *
 * Firebase is selected when there is a project to talk to, because a build
 * with no credentials cannot reach one — that was previously a blank page on
 * deploy. `VITE_BACKEND` overrides the inference either way.
 */
type Backend = 'firebase' | 'mock';

const declared = import.meta.env.VITE_BACKEND;
const configured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

export const backend: Backend =
  declared === 'firebase' || declared === 'mock'
    ? declared
    : configured
      ? 'firebase'
      : 'mock';

export const isMock = backend === 'mock';
