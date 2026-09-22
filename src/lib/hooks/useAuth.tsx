import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import {
  completeEmailLinkSignIn,
  isPlatformAdmin as checkPlatformAdmin,
  watchAuth,
} from '../auth.js';

interface AuthState {
  user: User | null;
  /** True until the first auth state arrives; not the same as signed out. */
  loading: boolean;
  /** Resolved alongside `user` — see `isPlatformAdmin` in lib/auth.ts. */
  isPlatformAdmin: boolean;
}

const INITIAL: AuthState = { user: null, loading: true, isPlatformAdmin: false };

const AuthContext = createContext<AuthState>(INITIAL);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL);

  useEffect(() => {
    // Landing on an email sign-in link completes it before we settle.
    void completeEmailLinkSignIn().catch(() => undefined);

    let cancelled = false;
    const unwatch = watchAuth((user) => {
      // The claim check is async (a token fetch on the Firebase side), so
      // the ordinary fields settle first and the admin flag follows once it
      // resolves, rather than holding every sign-in on that round trip.
      setState((prev) => ({ ...prev, user, loading: false }));
      void checkPlatformAdmin(user).then((admin) => {
        if (!cancelled) setState((prev) => ({ ...prev, isPlatformAdmin: admin }));
      });
    });

    return () => {
      cancelled = true;
      unwatch();
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
