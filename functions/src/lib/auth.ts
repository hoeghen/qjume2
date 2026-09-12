import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';

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
