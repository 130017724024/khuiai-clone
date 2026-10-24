import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';

export type User = {
  id: string;
  email: string;
  name: string;
  coins: number;
  avatarUrl: string | null;
  provider: string;
  xp: number;
  level: number;
};

type Providers = { email: boolean; google: boolean; facebook: boolean };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  providers: Providers;
  login: (input: { email: string; password: string }) => Promise<void>;
  signup: (input: { email: string; name: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateCoins: (coins: number) => void;
  updateUser: (patch: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Providers>({ email: true, google: false, facebook: false });

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: User | null }>('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    api<Providers>('/api/auth/providers')
      .then(setProviders)
      .catch(() => setProviders({ email: true, google: false, facebook: false }));
  }, [refresh]);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const data = await api<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setUser(data.user);
  }, []);

  const signup = useCallback(async (input: { email: string; name: string; password: string }) => {
    const data = await api<{ user: User }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const updateCoins = useCallback((coins: number) => updateUser({ coins }), [updateUser]);

  const value = useMemo(
    () => ({ user, loading, providers, login, signup, logout, refresh, updateCoins, updateUser }),
    [user, loading, providers, login, signup, logout, refresh, updateCoins, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
