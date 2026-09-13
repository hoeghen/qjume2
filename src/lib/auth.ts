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
import { isDemo } from './demo/mode.js';

const EMAIL_KEY = 'qjume:pending-email';

/**
 * The demo has no Firebase Auth, so it keeps a pretend session in memory.
 * Signing in is instant and accepts anything — there is nothing to protect.
 */
const demoUser = {
  uid: 'demo-owner',
  email: 'you@example.com',
  isAnonymous: false,
} as unknown as User;

let demoSignedIn = false;
const demoWatchers = new Set<(user: User | null) => void>();

function setDemoUser(signedIn: boolean) {
  demoSignedIn = signedIn;
  for (const watcher of demoWatchers) watcher(signedIn ? demoUser : null);
}

/**
 * Firebase's native email flow is a sign-in link, not the numeric code the PRD
 * describes. A code would need a custom function plus an email provider; the
 * link is what Auth supports out of the box, and reaches the same place.
 */
export async function sendEmailLink(email: string): Promise<void> {
  if (isDemo) {
    setDemoUser(true);
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
  if (isDemo) return false;
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
  if (isDemo) {
    setDemoUser(true);
    return;
  }
  await signInWithPopup(auth, new OAuthProvider('apple.com'));
}

/** Customers join without an account; anonymous auth still gives them a uid. */
export async function signInAsGuest(): Promise<void> {
  if (isDemo) {
    setDemoUser(true);
    return;
  }
  await signInAnonymously(auth);
}

export function signOut(): Promise<void> {
  if (isDemo) {
    setDemoUser(false);
    return Promise.resolve();
  }
  return fbSignOut(auth);
}

export function watchAuth(fn: (user: User | null) => void): () => void {
  if (isDemo) {
    demoWatchers.add(fn);
    fn(demoSignedIn ? demoUser : null);
    return () => demoWatchers.delete(fn);
  }
  return onAuthStateChanged(auth, fn);
}
