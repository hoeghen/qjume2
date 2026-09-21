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
 * A shop owner and a customer are not the same person.
 *
 * Customers sign in anonymously just to get a uid, and that session persists
 * like any other — so if both used one identity, joining a queue would hand
 * the customer the shop's admin screens.
 */
type Session = 'owner' | 'guest';

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
    return stored === 'owner' || stored === 'guest' ? stored : null;
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
