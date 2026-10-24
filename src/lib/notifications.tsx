import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';

export type NotificationItem = {
  type: 'checkin' | 'quest' | 'event';
  id: string;
  title: string;
  reward: number;
  href: string;
};

type NotificationsValue = {
  items: NotificationItem[];
  count: number;
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setCount(0);
      return;
    }
    try {
      const data = await api<{ count: number; items: NotificationItem[] }>('/api/notifications');
      setItems(data.items);
      setCount(data.count);
    } catch {
      setItems([]);
      setCount(0);
    }
  }, [user]);

  // Re-check whenever the route changes, so claiming elsewhere clears the dot.
  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  const value = useMemo(() => ({ items, count, refresh }), [items, count, refresh]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
