import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { loginRequest } from '../services/api';
import { clearAuthSession, getStoredToken, getStoredUser, setAuthSession } from '../services/authStorage';
import { subscribeUnauthorized } from '../services/authEvents';

export type AuthUser = { name: string; email: string };

type AuthContextValue = {
  user: AuthUser | null;
  sessionReady: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getStoredToken();
        const stored = await getStoredUser();
        if (!cancelled && token && stored) {
          setUser(stored);
        }
      } finally {
        if (!cancelled) setSessionReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeUnauthorized(() => {
      setUser(null);
    });
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const data = await loginRequest(email.trim(), senha);
    const u: AuthUser = {
      name: data.usuario.nome,
      email: data.usuario.email,
    };
    await setAuthSession(data.token, u);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await clearAuthSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      sessionReady,
      login,
      logout,
    }),
    [user, sessionReady, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
