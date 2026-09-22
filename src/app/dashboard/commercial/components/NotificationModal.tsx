// src/app/dashboard/commercial/components/NotificationModal.tsx

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
  X,
  CheckCheck,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface NotificationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  notifications: any[];
  loading?: boolean;
  error?: string | null;
  onMarkAsRead?: (id: string | number) => void;
  onMarkAllAsRead?: () => void;
}

export function NotificationModal({
  isOpen,
  onClose,
  notifications = [],
  loading = false,
  error = null,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationModalProps) {
  const router = useRouter();

  // ✅ ID de la notification actuellement dépliée
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  useEffect(() => {
    if (!isOpen) {
      setExpandedId(null); // réinitialise quand on ferme
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ---------- Helpers visuels ----------
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
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // ✅ Clic sur une notification → toggle dépliage + marque comme lue
  const handleToggle = (notif: any) => {
    const isOpening = expandedId !== notif.id;
    setExpandedId(isOpening ? notif.id : null);

    // Marquer comme lue dès la première ouverture
    if (isOpening && !notif.isRead && onMarkAsRead) {
      onMarkAsRead(notif.id);
    }
  };

  // ✅ Navigation depuis le contenu déplié
  const handleGoToLink = (e: React.MouseEvent, lien: string) => {
    e.stopPropagation();
    router.push(lien);
    onClose?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay cliquable */}
          <motion.div
            key="overlay"
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Panneau */}
          <motion.div
            key="panel"
            className="fixed top-16 right-4 z-50 w-[420px] max-w-[calc(100vw-2rem)]
                       bg-white rounded-2xl shadow-2xl shadow-slate-900/10
                       ring-1 ring-slate-200 overflow-hidden"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* ===== Header ===== */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-semibold text-slate-800">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded-full font-bold leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {onMarkAllAsRead && unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600
                               hover:bg-blue-50 transition"
                    title="Tout marquer comme lu"
                  >
                    <CheckCheck size={15} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700
                             hover:bg-slate-100 transition"
                  title="Fermer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ===== Liste ===== */}
            <div className="max-h-[520px] overflow-y-auto notification-scroll">
              {/* Chargement */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                  <p className="text-xs text-slate-400">Chargement…</p>
                </div>
              )}

              {/* Erreur */}
              {!loading && error && (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
                  <p className="text-sm font-medium text-red-600">Erreur</p>
                  <p className="text-xs text-red-400 text-center mt-1">{error}</p>
                </div>
              )}

              {/* Vide */}
              {!loading && !error && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-slate-50 rounded-full mb-3">
                    <BellOff className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    Aucune notification
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Vous êtes à jour ✨
                  </p>
                </div>
              )}

              {/* Liste accordéon */}
              {!loading && !error && notifications.length > 0 && (
                <ul className="divide-y divide-slate-100">
                  {notifications.map((notif: any) => {
                    const isExpanded = expandedId === notif.id;

                    return (
                      <li
                        key={notif.id}
                        className={`relative transition-colors
                          ${notif.isRead ? 'bg-white' : 'bg-blue-50/40'}
                        `}
                      >
                        {/* ====== EN-TÊTE (toujours visible) ====== */}
                        <button
                          onClick={() => handleToggle(notif)}
                          className="w-full text-left flex items-start gap-3 px-4 py-3.5
                                     hover:bg-slate-50/70 transition group"
                        >
                          {/* Icône */}
                          <div
                            className={`mt-0.5 flex-shrink-0 p-2 rounded-lg ${getIconBg(
                              notif.type
                            )}`}
                          >
                            {getIcon(notif.type)}
                          </div>

                          {/* Titre + aperçu */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-sm leading-tight truncate
                                  ${
                                    notif.isRead
                                      ? 'font-medium text-slate-700'
                                      : 'font-semibold text-slate-900'
                                  }`}
                              >
                                {notif.title || notif.titre || 'Notification'}
                              </p>

                              {!notif.isRead && (
                                <span
                                  className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${getDotColor(
                                    notif.type
                                  )}`}
                                />
                              )}
                            </div>

                            {/* Aperçu tronqué quand replié */}
                            {!isExpanded && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                {notif.message}
                              </p>
                            )}

                            {/* Date + chevron */}
                            <div className="flex items-center justify-between mt-1.5">
                              <p className="text-[10px] text-slate-400 font-medium">
                                {formatDate(notif.createdAt)}
                              </p>

                              <motion.span
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-slate-400 group-hover:text-slate-600"
                              >
                                <ChevronDown size={14} />
                              </motion.span>
                            </div>
                          </div>
                        </button>

                        {/* ====== CONTENU DÉPLIÉ ====== */}
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
                              <div className="px-4 pb-4 pl-[60px]">
                                {/* Message complet */}
                                <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed
                                                bg-slate-50 rounded-lg p-3 border border-slate-100">
                                  {notif.message}
                                </div>

                                {/* Lien d'action */}
                                {notif.lien && (
                                  <button
                                    onClick={(e) => handleGoToLink(e, notif.lien)}
                                    className="mt-3 inline-flex items-center gap-1.5
                                               text-xs font-semibold text-blue-600
                                               hover:text-blue-700 transition group/link"
                                  >
                                    Voir le détail
                                    <ArrowRight
                                      size={12}
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

            {/* ===== Footer ===== */}
            {notifications.length > 0 && !loading && (
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[10px] text-slate-400">
                  {notifications.length} au total
                </p>
                <button
                  onClick={() => {
                    router.push('/dashboard/commercial/notifications');
                    onClose?.();
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700
                             transition"
                >
                  Tout voir →
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}