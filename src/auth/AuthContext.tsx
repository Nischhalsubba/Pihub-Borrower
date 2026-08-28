import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSession, requestPasswordReset, signIn as apiSignIn, signOut as apiSignOut, type SessionUser } from '../services/platformApi';
import { runtimeMode } from '../services/runtime';

const DEMO_EMAIL = 'borrower@pihub.demo';
const DEMO_PASSWORD = 'Borrower2026!';
const DEMO_KEY = 'pihub.borrower.session';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';
interface AuthContextValue {
  mode: 'demo' | 'api';
  status: AuthStatus;
  user?: SessionUser;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  demoCredentials?: { email: string; password: string };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const mode = runtimeMode();
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<SessionUser>();

  useEffect(() => {
    let alive = true;
    if (mode === 'demo') {
      const authenticated = sessionStorage.getItem(DEMO_KEY) === 'demo';
      setStatus(authenticated ? 'authenticated' : 'unauthenticated');
      setUser(authenticated ? { id: 'demo-borrower', email: DEMO_EMAIL, name: 'Marta Klein', modules: ['borrower'] } : undefined);
      return () => { alive = false; };
    }
    void getSession().then((session) => {
      if (!alive) return;
      const allowed = session.authenticated && session.user?.modules.includes('borrower');
      setUser(allowed ? session.user : undefined);
      setStatus(allowed ? 'authenticated' : 'unauthenticated');
    }).catch(() => { if (alive) setStatus('unauthenticated'); });
    return () => { alive = false; };
  }, [mode]);

  const value = useMemo<AuthContextValue>(() => ({
    mode,
    status,
    user,
    demoCredentials: mode === 'demo' ? { email: DEMO_EMAIL, password: DEMO_PASSWORD } : undefined,
    async signIn(email, password) {
      setStatus('checking');
      if (mode === 'demo') {
        if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
          setStatus('unauthenticated');
          throw new Error('Use the Borrower demo account shown below. Other PiHub module credentials are not accepted here.');
        }
        sessionStorage.setItem(DEMO_KEY, 'demo');
        setUser({ id: 'demo-borrower', email: DEMO_EMAIL, name: 'Marta Klein', modules: ['borrower'] });
        setStatus('authenticated');
        return;
      }
      try {
        const session = await apiSignIn(email, password);
        if (!session.authenticated || !session.user?.modules.includes('borrower')) throw new Error('This account is not authorized for the Borrower workspace.');
        setUser(session.user);
        setStatus('authenticated');
      } catch (error) {
        setStatus('unauthenticated');
        throw error;
      }
    },
    async signOut() {
      if (mode === 'demo') sessionStorage.removeItem(DEMO_KEY);
      else await apiSignOut();
      setUser(undefined);
      setStatus('unauthenticated');
    },
    async resetPassword(email) {
      if (mode === 'demo') return;
      await requestPasswordReset(email);
    }
  }), [mode, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
