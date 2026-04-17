import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type User = { name: string };

type AuthContextValue = {
  user: User | null;
  login: (name: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((name: string) => {
    setUser({ name: name.trim() || 'Usuário' });
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
