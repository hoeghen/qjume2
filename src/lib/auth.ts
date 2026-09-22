import {
  GoogleAuthProvider,
  OAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInAnonymously,
  signInWithEmailLink,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebase.js';
import { isMock } from './mock/mode.js';

const EMAIL_KEY = 'qjume:pending-email';

/**
 * The mock backend has no Firebase Auth, so it keeps its own session.
 * Signing in is instant and accepts anything — there is nothing to protect.
 */
/**
 * A shop owner, a customer and the platform admin are three different people.
 *
 * Customers sign in anonymously just to get a uid, and that session persists
 * like any other — so if both used one identity, joining a queue would hand
 * the customer the shop's admin screens. `admin` is a third, separate from
 * either: it stands in for the `platformAdmin` custom claim a real deployment
 * sets by hand on one account, so `/admin` has something to test against
 * without touching Firebase. See CLAUDE.md decision 9.
 */
type Session = 'owner' | 'guest' | 'admin';

const LOCAL_USERS: Record<Session, User> = {
  owner: {
    uid: 'local-owner',
    email: 'you@example.com',
    isAnonymous: false,
  } as unknown as User,
  guest: {
    uid: 'local-guest',
    email: null,
    isAnonymous: true,
  } as unknown as User,
  admin: {
    uid: 'local-admin',
    email: 'admin@qjume.local',
    isAnonymous: false,
  } as unknown as User,
};

/**
 * The session outlives a reload, like a real one.
 *
 * The store already persists, so without this a shop owner refreshing the
 * serving screen kept their queue but lost their sign-in — half-remembered
 * state, which is worse than either.
 */
const SESSION_KEY = 'qjume:session';

function readSession(): Session | null {
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    return stored === 'owner' || stored === 'guest' || stored === 'admin'
      ? stored
      : null;
  } catch {
    return null;
  }
}

let localSession = readSession();
const localWatchers = new Set<(user: User | null) => void>();

function setLocalUser(session: Session | null) {
  localSession = session;
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, session);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Private mode or blocked storage: the session lasts the tab, which is
    // the old behaviour rather than a failure.
  }
  const user = session ? LOCAL_USERS[session] : null;
  for (const watcher of localWatchers) watcher(user);
}

/**
 * Firebase's native email flow is a sign-in link, not the numeric code the PRD
 * describes. A code would need a custom function plus an email provider; the
 * link is what Auth supports out of the box, and reaches the same place.
 */
export async function sendEmailLink(email: string): Promise<void> {
  if (isMock) {
    setLocalUser('owner');
    return;
  }
  await sendSignInLinkToEmail(auth, email, {
    url: `${window.location.origin}/shop`,
    handleCodeInApp: true,
  });
  try {
    window.localStorage.setItem(EMAIL_KEY, email);
  } catch {
    // Private browsing can refuse storage; the user is prompted for the
    // address again when they follow the link.
  }
}

/**
 * A sign-in code is single-use, so a second attempt with the same URL fails.
 * React's development double-mount would do exactly that, so the attempt is
 * made at most once per page load.
 */
let emailLinkAttempted = false;

/** Completes sign-in if the current URL is an email link. */
export async function completeEmailLinkSignIn(): Promise<boolean> {
  if (isMock) return false;
  if (emailLinkAttempted) return false;
  if (!isSignInWithEmailLink(auth, window.location.href)) return false;
  emailLinkAttempted = true;

  let email: string | null = null;
  try {
    email = window.localStorage.getItem(EMAIL_KEY);
  } catch {
    email = null;
  }
  email ??= window.prompt('Confirm the email address you signed in with');
  if (!email) return false;

  await signInWithEmailLink(auth, email, window.location.href);
  try {
    window.localStorage.removeItem(EMAIL_KEY);
  } catch {
    // Nothing to clean up.
  }
  return true;
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

/**
 * Included because Apple's App Store guidelines require it wherever
 * third-party sign-in is offered — cheaper now than reworking it if a native
 * wrapper ever ships. See PRD 5.1.
 */
export async function signInWithApple(): Promise<void> {
  if (isMock) {
    setLocalUser('owner');
    return;
  }
  await signInWithPopup(auth, new OAuthProvider('apple.com'));
}

/** Customers join without an account; anonymous auth still gives them a uid. */
export async function signInAsGuest(): Promise<void> {
  if (isMock) {
    // A guest, not the owner — joining a queue must not hand someone a shop.
    // Never downgrade an owner who is already signed in.
    setLocalUser(localSession ?? 'guest');
    return;
  }
  await signInAnonymously(auth);
}

/**
 * Mock-only. There is no client sign-up for the platform admin — a real
 * deployment sets the `platformAdmin` claim by hand, once, against the one
 * account that needs it, and there is deliberately no code path that grants
 * it from a request. This is the mock's stand-in for already having that
 * claim, not a way to get it.
 */
export async function signInAsPlatformAdmin(): Promise<void> {
  if (!isMock) {
    throw new Error(
      'The platform admin claim is set on the Firebase account directly; there is no sign-in flow for it here.',
    );
  }
  setLocalUser('admin');
}

/**
 * Whether `user` holds the platform admin claim.
 *
 * Mock: the `local-admin` identity is the claim's stand-in — see
 * `signInAsPlatformAdmin`. Firebase: the claim lives on the ID token, so it
 * costs a token fetch (cached by the SDK, refreshed roughly hourly) rather
 * than being available synchronously off the `User` object.
 */
export async function isPlatformAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (isMock) return user.uid === 'local-admin';
  const token = await user.getIdTokenResult();
  return token.claims['platformAdmin'] === true;
}

export function signOut(): Promise<void> {
  if (isMock) {
    setLocalUser(null);
    return Promise.resolve();
  }
  return fbSignOut(auth);
}

export function watchAuth(fn: (user: User | null) => void): () => void {
  if (isMock) {
    localWatchers.add(fn);
    fn(localSession ? LOCAL_USERS[localSession] : null);
    return () => localWatchers.delete(fn);
  }
  return onAuthStateChanged(auth, fn);
}
