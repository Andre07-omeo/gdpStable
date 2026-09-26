'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/notifications/useNotifications.tsimport { useState, useEffect, useCallback, useRef } from 'react';
import { AppNotification, NOTIFICATION_PRIORITY } from '@/lib/notifications/types';
import {
  playNotificationFeedback,
  showBrowserNotification,
  requestNotificationPermission,
} from '@/lib/notifications/notificationSound';

export function useNotifications(userId?: string | number) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const permissionAskedRef = useRef(false);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notifications?userId=${userId}&limit=50`);
      if (!res.ok) throw new Error('Erreur chargement');
      const data: AppNotification[] = await res.json();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch (err: any) {
      console.error('❌ loadNotifications:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    if (!permissionAskedRef.current) {
      permissionAskedRef.current = true;
      requestNotificationPermission().catch(() => {});
    }

    const es = new EventSource(`/api/notifications/stream?userId=${userId}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);

        if (payload.type === 'notification') {
          const notif: AppNotification = payload.data;

          setNotifications((prev) => [notif, ...prev]);
          setUnreadCount((c) => c + 1);

          const priority = NOTIFICATION_PRIORITY[notif.type] || 'normal';
          playNotificationFeedback(priority);

          showBrowserNotification(notif.title, notif.message, {
            tag: `notif-${notif.id}`,
            onClick: () => {
              if (notif.lien) window.location.href = notif.lien;
            },
          });
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      console.warn('⚠️ SSE erreur, reconnexion...');
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [userId, loadNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    } catch (err) {
      console.error('❌ markAsRead:', err);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      );
      setUnreadCount((c) => c + 1);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await fetch(`/api/notifications/read-all?userId=${userId}`, { method: 'PATCH' });
    } catch (err) {
      console.error('❌ markAllAsRead:', err);
      setNotifications(previous);
      setUnreadCount(previous.filter((n) => !n.isRead).length);
    }
  }, [notifications, userId]);

  const deleteNotification = useCallback(async (id: string) => {
    const previous = notifications;
    const wasUnread = notifications.find((n) => n.id === id && !n.isRead);

    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('❌ deleteNotification:', err);
      setNotifications(previous);
      if (wasUnread) setUnreadCount((c) => c + 1);
    }
  }, [notifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    refresh: loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}