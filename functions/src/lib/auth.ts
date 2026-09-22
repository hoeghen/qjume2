import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { fail } from './errors.js';

export interface Caller {
  uid: string;
  /** True when signed in through Firebase Anonymous Auth. */
  isAnonymous: boolean;
}

export function requireCaller(request: CallableRequest<unknown>): Caller {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Sign-in required.');
  }
  return {
    uid: auth.uid,
    isAnonymous: auth.token.firebase?.sign_in_provider === 'anonymous',
  };
}

export interface AdminCaller {
  uid: string;
  email: string | null;
}

/**
 * Every admin function's front door.
 *
 * The claim is set once, out of band (the Admin SDK's
 * `setCustomUserClaims`, run by hand against the one platform-admin account
 * — there is no self-serve grant path from the client, deliberately: there
 * is nobody yet for a client-visible "make me an admin" flow to serve).
 * Checked here rather than in security rules because every admin mutation
 * already comes through a callable for its audit entry; this is the one
 * place that needs to agree with `firestore.rules`' own `isPlatformAdmin()`.
 */
export function requirePlatformAdmin(
  request: CallableRequest<unknown>,
): AdminCaller {
  const auth = request.auth;
  if (!auth || auth.token['platformAdmin'] !== true) {
    throw fail(
      'permission-denied',
      'not-platform-admin',
      'Platform admin access required.',
    );
  }
  return { uid: auth.uid, email: auth.token.email ?? null };
}
