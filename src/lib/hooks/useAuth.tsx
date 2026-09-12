import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { completeEmailLinkSignIn, watchAuth } from '../auth.js';

interface AuthState {
  user: User | null;
  /** True until the first auth state arrives; not the same as signed out. */
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    // Landing on an email sign-in link completes it before we settle.
    void completeEmailLinkSignIn().catch(() => undefined);
    return watchAuth((user) => setState({ user, loading: false }));
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
