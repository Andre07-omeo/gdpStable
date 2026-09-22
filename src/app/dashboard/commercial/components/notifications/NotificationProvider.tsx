// src/app/dashboard/commercial/components/notifications/NotificationProvider.tsx

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useNotifications } from './useNotifications';
import { useAuth } from '@/context/AuthContext';

const NotificationContext = createContext<ReturnType<typeof useNotifications> | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const value = useNotifications(user?.id);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext doit être utilisé dans NotificationProvider');
  return ctx;
}