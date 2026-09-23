// src/app/dashboard/commercial/notifications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Loader2,
  CheckCheck,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string | number;
  type: string;
  title?: string;
  titre?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  lien?: string;
}

export default function NotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    async function fetchNotifications() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/commercials/notifications', {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
        const data = await res.json();
        setNotifications(data.data || data.notifications || []);
      } catch (err: any) {
        console.error('❌ Erreur notifications:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string | number) => {
    try {
      await fetch(`/api/commercials/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Erreur markAsRead:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/commercials/notifications/mark-all', {
        method: 'POST',
        credentials: 'include',
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Erreur markAllAsRead:', err);
    }
  };

  const handleToggle = (notif: Notification) => {
    const isOpening = expandedId !== notif.id;
    setExpandedId(isOpening ? notif.id : null);
    if (isOpening && !notif.isRead) handleMarkAsRead(notif.id);
  };

  // ---- Helpers visuels ----
  const getIcon = (type: string) => {
    switch (type) {
      case 'panneau_problem':
      case 'facture_rejetee':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'facture_valide':
      case 'facture_validee':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'reservation_created':
      case 'campaign_started':
      case 'panneau_created':
        return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'campaign_ending_soon':
      case 'message_from_chef':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const getIconBg = (type: string) => {
    if (type === 'panneau_problem' || type === 'facture_rejetee') return 'bg-red-50';
    if (type === 'facture_valide' || type === 'facture_validee') return 'bg-emerald-50';
    if (type === 'campaign_ending_soon' || type === 'message_from_chef') return 'bg-amber-50';
    return 'bg-blue-50';
  };

  const getDotColor = (type: string) => {
    if (type === 'panneau_problem' || type === 'facture_rejetee') return 'bg-red-500';
    if (type === 'facture_valide' || type === 'facture_validee') return 'bg-emerald-500';
    if (type === 'campaign_ending_soon' || type === 'message_from_chef') return 'bg-amber-500';
    return 'bg-blue-500';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "à l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 lg:p-8">
      {/* ===== En-tête de la page ===== */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-blue-100">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded-full font-bold">
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Consultez et gérez toutes vos notifications
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                       text-sm font-semibold text-blue-600 bg-blue-50
                       hover:bg-blue-100 transition"
          >
            <CheckCheck size={16} />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* ===== Carte principale ===== */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        {/* Chargement */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm text-slate-400">Chargement…</p>
          </div>
        )}

        {/* Erreur */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 px-6">
            <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-base font-medium text-red-600">Erreur de chargement</p>
            <p className="text-sm text-red-400 text-center mt-1">{error}</p>
          </div>
        )}

        {/* Vide */}
        {!loading && !error && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="p-5 bg-slate-50 rounded-full mb-4">
              <BellOff className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-base font-medium text-slate-600">
              Aucune notification
            </p>
            <p className="text-sm text-slate-400 mt-1">Vous êtes à jour ✨</p>
          </div>
        )}

        {/* Liste */}
        {!loading && !error && notifications.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {notifications.map((notif) => {
              const isExpanded = expandedId === notif.id;

              return (
                <li
                  key={notif.id}
                  className={`transition-colors ${
                    notif.isRead ? 'bg-white' : 'bg-blue-50/40'
                  }`}
                >
                  <button
                    onClick={() => handleToggle(notif)}
                    className="w-full text-left flex items-start gap-4 px-6 py-4
                               hover:bg-slate-50/70 transition group"
                  >
                    <div
                      className={`mt-0.5 flex-shrink-0 p-2.5 rounded-lg ${getIconBg(
                        notif.type
                      )}`}
                    >
                      {getIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={`text-base leading-tight ${
                            notif.isRead
                              ? 'font-medium text-slate-700'
                              : 'font-semibold text-slate-900'
                          }`}
                        >
                          {notif.title || notif.titre || 'Notification'}
                        </p>

                        {!notif.isRead && (
                          <span
                            className={`mt-2 w-2 h-2 rounded-full flex-shrink-0 ${getDotColor(
                              notif.type
                            )}`}
                          />
                        )}
                      </div>

                      {!isExpanded && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                          {notif.message}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-slate-400 font-medium">
                          {formatDate(notif.createdAt)}
                        </p>

                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-slate-400 group-hover:text-slate-600"
                        >
                          <ChevronDown size={16} />
                        </motion.span>
                      </div>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 pl-[72px]">
                          <div
                            className="text-sm text-slate-600 whitespace-pre-line
                                       leading-relaxed bg-slate-50 rounded-lg p-4
                                       border border-slate-100"
                          >
                            {notif.message}
                          </div>

                          {notif.lien && (
                            <button
                              onClick={() => router.push(notif.lien!)}
                              className="mt-3 inline-flex items-center gap-1.5
                                         text-sm font-semibold text-blue-600
                                         hover:text-blue-700 transition group/link"
                            >
                              Voir le détail
                              <ArrowRight
                                size={14}
                                className="transition-transform group-hover/link:translate-x-0.5"
                              />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}