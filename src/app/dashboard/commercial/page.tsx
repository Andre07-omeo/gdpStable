'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/page.tsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import {
  LayoutDashboard,
  MapPin,
  Calendar,
  Users,
  BarChart3,
  Loader2,
  FileText,
  Map,
  Bell,
  BellOff,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Info,
  CheckCheck,
  ArrowRight,
  RefreshCw,
  ClipboardCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  loadReservationsByFace,
  ReservationsMap,
  createEmptyReservationsMap,
} from './components/filters/reservationsLoader';

// ============================================
// HOOKS
// ============================================
import { useCommercialData } from './hooks/useCommercialData';
import { usePanneauxFilters } from './hooks/usePanneauxFilters';
import { getFeaturesByProfil } from './types/commercial.types';

// ============================================
// COMPOSANTS
// ============================================
import { StatCard } from '@/components/shared/StatCard';
import {
  PanneauxTable,
  CommercialHeader,
  FaceDetailModal,
  CartPanel,
  StatsPanel,
  AdminModal,
  CatalogueContent,
  ReportsModal,
  PredictionsModal,
  TeamManagementModal,
  ReservationsManagementModal,
  ReservationModal,
  PanneauReservationsModal,
  PendingReservationsTab,
} from './components';

// ============================================
// ✅ CARTE : chargement dynamique SANS SSR
// ============================================
const MapComponent = dynamicImport(() => import('./components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950">
      <div className="text-center px-4">
        <div className="w-14 h-14 sm:w-20 sm:h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/80 text-sm sm:text-lg font-bold uppercase tracking-wider">
          Chargement de la carte...
        </p>
      </div>
    </div>
  ),
});

// ✅ Filtres unifiés
import { PanneauFilters } from './components/filters/PanneauFilters';
import { filterPanneaux } from './components/filters/filterLogic';
import { PanneauFiltersState } from './components/filters/types';

// ============================================
// TYPES
// ============================================
import { CommercialPanneau, CommercialFace } from './types/commercial.types';

interface Notification {
  id: string | number;
  type: string;
  title?: string;
  titre?: string;
  message: string;
  lien?: string | null;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

type CleanupStatus =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'success'; terminees: number; expirees: number }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

const DEFAULT_FILTERS: PanneauFiltersState = {
  search: '',
  situation: 'tous',
  faceSituation: 'tous',
  echeanceActive: false,
  echeanceDebut: '',
  echeanceFin: '',
};

type TabKey =
  | 'dashboard'
  | 'catalogue'
  | 'map'
  | 'pending'
  | 'notifications'
  | 'reservations';

// ============================================
// 🆕 COMPOSANT INTERNE : ONGLET NOTIFICATIONS
// ============================================
function NotificationsTab({ user }: { user: any }) {
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
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
        const data = await res.json();
        setNotifications(data.data || data.notifications || data || []);
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
    if (type === 'panneau_problem' || type === 'facture_rejetee')
      return 'bg-red-50';
    if (type === 'facture_valide' || type === 'facture_validee')
      return 'bg-emerald-50';
    if (type === 'campaign_ending_soon' || type === 'message_from_chef')
      return 'bg-amber-50';
    return 'bg-blue-50';
  };

  const getDotColor = (type: string) => {
    if (type === 'panneau_problem' || type === 'facture_rejetee')
      return 'bg-red-500';
    if (type === 'facture_valide' || type === 'facture_validee')
      return 'bg-emerald-500';
    if (type === 'campaign_ending_soon' || type === 'message_from_chef')
      return 'bg-amber-500';
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
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 sm:py-24">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm text-slate-400">Chargement…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-6">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-base font-medium text-red-600">
            Erreur de chargement
          </p>
          <p className="text-sm text-red-400 text-center mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <div className="p-2 rounded-lg bg-blue-100">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Notifications
            </h1>
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
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition whitespace-nowrap w-full sm:w-auto"
          >
            <CheckCheck size={16} />
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4">
            <div className="p-5 bg-slate-50 rounded-full mb-4">
              <BellOff className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-base font-medium text-slate-600">
              Aucune notification
            </p>
            <p className="text-sm text-slate-400 mt-1">Vous êtes à jour ✨</p>
          </div>
        ) : (
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
                    className="w-full text-left flex items-start gap-3 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 hover:bg-slate-50/70 transition group"
                  >
                    <div
                      className={`mt-0.5 flex-shrink-0 p-2 sm:p-2.5 rounded-lg ${getIconBg(
                        notif.type
                      )}`}
                    >
                      {getIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={`text-sm sm:text-base leading-tight break-words ${
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

                      {!isExpanded && (
                        <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-1 break-words">
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
                        <div className="px-3 sm:px-6 pb-4 sm:pb-5 sm:pl-[72px]">
                          <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-100 break-words">
                            {notif.message}
                          </div>

                          {notif.lien && (
                            <button
                              onClick={() => router.push(notif.lien!)}
                              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition group/link"
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

// ============================================
// 🆕 BANDEAU DE NETTOYAGE
// ============================================
function CleanupBanner({
  status,
  onRetry,
  onClose,
}: {
  status: CleanupStatus;
  onRetry: () => void;
  onClose: () => void;
}) {
  if (status.kind === 'idle' || status.kind === 'running') return null;

  let bg = 'bg-slate-50 border-slate-200';
  let text = 'text-slate-700';
  let icon = <Info className="w-4 h-4" />;
  let message = '';

  if (status.kind === 'success') {
    bg = 'bg-emerald-50 border-emerald-200';
    text = 'text-emerald-800';
    icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    message = `Nettoyage réussi — ${status.terminees} terminée(s), ${status.expirees} expirée(s).`;
  } else if (status.kind === 'empty') {
    bg = 'bg-blue-50 border-blue-200';
    text = 'text-blue-800';
    icon = <Info className="w-4 h-4 text-blue-600" />;
    message = 'Aucune réservation à nettoyer.';
  } else if (status.kind === 'error') {
    bg = 'bg-red-50 border-red-200';
    text = 'text-red-800';
    icon = <AlertTriangle className="w-4 h-4 text-red-600" />;
    message = `Erreur de nettoyage : ${status.message}`;
  }

  return (
    <div
      className={`mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 border rounded-lg px-3 sm:px-4 py-2 text-sm ${bg} ${text}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0">{icon}</span>
        <span className="break-words">{message}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/60 hover:bg-white text-xs font-bold border border-current/20"
          title="Relancer le nettoyage"
        >
          <RefreshCw size={12} />
          Relancer
        </button>
        <button
          onClick={onClose}
          className="text-xs font-bold underline opacity-70 hover:opacity-100"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

// ============================================
// 🆕 COMPOSANT INTERNE PRINCIPAL
// ============================================
function CommercialDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user, logout } = useAuth();
  const { addItem } = useCart();
  const { panneaux, loading, error, refresh } = useCommercialData();

  const { stats } = usePanneauxFilters({ panneaux });

  const [filters, setFilters] = useState<PanneauFiltersState>(DEFAULT_FILTERS);

  const [reservationsMap, setReservationsMap] = useState<ReservationsMap>(
    createEmptyReservationsMap()
  );

  const features = user ? getFeaturesByProfil(user.profil) : null;

  const initialTab = (searchParams.get('tab') as TabKey) || 'dashboard';
  const [activeTab, setActiveTab] = useState<TabKey>(
    ['dashboard', 'catalogue', 'map', 'pending', 'reservations', 'notifications'].includes(
      initialTab
    )
      ? initialTab
      : 'dashboard'
  );

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const [isStatsExpanded, setIsStatsExpanded] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [cleanupStatus, setCleanupStatus] = useState<CleanupStatus>({
    kind: 'idle',
  });

  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isPredictionsOpen, setIsPredictionsOpen] = useState(false);
  const [isTeamManagementOpen, setIsTeamManagementOpen] = useState(false);
  const [isReservationsManagementOpen, setIsReservationsManagementOpen] =
    useState(false);

  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [selectedPanneau, setSelectedPanneau] =
    useState<CommercialPanneau | null>(null);
  const [selectedFace, setSelectedFace] = useState<CommercialFace | null>(null);

  const [isPanneauReservationsModalOpen, setIsPanneauReservationsModalOpen] =
    useState(false);
  const [selectedPanneauForReservations, setSelectedPanneauForReservations] =
    useState<CommercialPanneau | null>(null);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/commercials/notifications', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setNotifications(
        Array.isArray(data) ? data : data.data || data.notifications || []
      );
    } catch (err: any) {
      console.error('❌ Erreur chargement notifications:', err);
      setNotifications([]);
    }
  }, [user]);

  const reloadReservationsMap = useCallback(async () => {
    try {
      const map = await loadReservationsByFace();
      setReservationsMap(map);
    } catch (err) {
      console.error('❌ Erreur chargement réservations:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadReservationsByFace().then((map) => {
      if (!cancelled) setReservationsMap(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    loadNotifications();

    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
    }

    notificationIntervalRef.current = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
        notificationIntervalRef.current = null;
      }
    };
  }, [user, loadNotifications]);

  const executerNettoyage = useCallback(
    async (force: boolean = false) => {
      const dejaFait = sessionStorage.getItem('nettoyage_reservations_fait');
      if (!force && dejaFait) return;

      setCleanupStatus({ kind: 'running' });

      try {
        const response = await fetch('/api/reservations/clean', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Cleanup-Token': 'mon-token-securise-123456',
          },
          credentials: 'include',
          body: JSON.stringify({ batch: 50 }),
        });

        if (!response.ok) {
          const txt = await response.text().catch(() => '');
          throw new Error(
            `HTTP ${response.status}${txt ? ' — ' + txt.slice(0, 120) : ''}`
          );
        }

        const result = await response.json();

        const terminees = Number(result?.data?.terminees ?? 0);
        const expirees = Number(result?.data?.expirees ?? 0);

        if (terminees === 0 && expirees === 0) {
          setCleanupStatus({ kind: 'empty' });
        } else {
          setCleanupStatus({ kind: 'success', terminees, expirees });
          refresh();
          reloadReservationsMap();
        }

        sessionStorage.setItem('nettoyage_reservations_fait', 'true');
      } catch (err: any) {
        console.error('❌ Nettoyage auto échoué:', err?.message || err);
        setCleanupStatus({
          kind: 'error',
          message: err?.message || 'Erreur inconnue',
        });
      }
    },
    [refresh, reloadReservationsMap]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      executerNettoyage(false);
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('GPS non supporté');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setLocationError('GPS non disponible'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const openFaceDetails = (
    panneau: CommercialPanneau,
    face: CommercialFace
  ): void => {
    const faceId =
      typeof face.id_face === 'number'
        ? face.id_face
        : parseInt(face.id_face.toString() || '0');
    setSelectedFaceId(faceId);
    setIsFaceModalOpen(true);
  };

  const handleReserveClick = (
    panneau: CommercialPanneau,
    face?: CommercialFace
  ): void => {
    if (face) {
      setSelectedPanneau(panneau);
      setSelectedFace(face);
      setIsReservationModalOpen(true);
    } else {
      setSelectedPanneauForReservations(panneau);
      setIsPanneauReservationsModalOpen(true);
    }
  };

  const refreshData = useCallback(async (): Promise<void> => {
    try {
      await Promise.all([
        Promise.resolve(refresh()),
        reloadReservationsMap(),
        loadNotifications(),
      ]);
    } catch (err) {
      console.error('❌ Erreur refresh global:', err);
    }
  }, [refresh, reloadReservationsMap, loadNotifications]);

  const handleMapMarkerClick = (panneau: any) => {
    setSelectedPanneau(panneau);
    setIsPanneauReservationsModalOpen(true);
  };

  const handleMapReserveClick = (panneau: any, face?: any) => {
    if (face) {
      setSelectedPanneau(panneau);
      setSelectedFace(face);
      setIsReservationModalOpen(true);
    } else {
      setSelectedPanneau(panneau);
      setIsPanneauReservationsModalOpen(true);
    }
  };

  const handleMapAddToCart = (panneau: any, face?: any) => {
    if (!face) return;
    addItem({
      id_face: face.id_face,
      id_panneau: panneau.id_panneau || panneau.id,
      panneau_nom: panneau.nom || 'Panneau sans nom',
      panneau_adresse: panneau.adresse || 'Adresse non définie',
      orientation: face.orientation || 'N/A',
      type_face: face.type_face || 'Standard',
      dimension_m2: 'N/A',
      statut: face.status || 'Libre',
      prix_saisi: 0,
      currency: 'CDF' as const,
    });
  };

  const handleNotificationsToggle = () => {
    handleTabChange('notifications');
  };

  const statsCards = [
    {
      label: 'Panneaux',
      value: stats.totalPanneaux,
      icon: <LayoutDashboard size={12} />,
      color: 'blue' as const,
    },
    {
      label: 'Faces',
      value: stats.totalFaces,
      icon: <MapPin size={12} />,
      color: 'indigo' as const,
    },
    {
      label: 'Libres',
      value: stats.totalLibres,
      icon: <FileText size={12} />,
      color: 'emerald' as const,
    },
    {
      label: 'Occupées',
      value: stats.totalOccupes,
      icon: <Users size={12} />,
      color: 'blue' as const,
    },
    {
      label: 'Réservées',
      value: stats.totalReserves,
      icon: <Calendar size={12} />,
      color: 'amber' as const,
    },
    {
      label: 'Rés. Futures',
      value: stats.totalReservationsFutures || 0,
      icon: <BarChart3 size={12} />,
      color: 'purple' as const,
    },
  ];

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const transformedPanneaux = useMemo(() => {
    return panneaux.map((p: any) => ({
      id_panneau: p.id_panneau || p.idPan || p.id,
      idPan: p.idPan || p.id,
      nom: p.nom || 'Panneau sans nom',
      adresse: p.adresse || 'Adresse non définie',
      latitude: p.latitude || p.lat || 0,
      longitude: p.longitude || p.lng || 0,
      etat: p.etat || p.etatPanneau || 'Actif',
      etatPanneau: p.etatPanneau || p.etat,
      a_probleme: p.a_probleme || false,
      faces: p.faces || [],
      commune: p.commune || '',
      province: p.province || '',
      ville: p.ville || '',
    }));
  }, [panneaux]);

  const panneauxFiltres = useMemo(() => {
    return filterPanneaux(transformedPanneaux, filters, reservationsMap);
  }, [transformedPanneaux, filters, reservationsMap]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-500">
            Chargement des données...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md w-full">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Erreur de chargement
          </h2>
          <p className="text-gray-600 mb-4 break-words">{error}</p>
          <button
            onClick={refreshData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      key: 'dashboard' as TabKey,
      icon: <LayoutDashboard size={16} />,
      label: 'Tableau',
    },
    {
      key: 'catalogue' as TabKey,
      icon: <span>📸</span>,
      label: 'Catalogue',
    },
    {
      key: 'map' as TabKey,
      icon: <Map size={16} />,
      label: 'Carte',
    },
    {
      key: 'pending' as TabKey,
      icon: <Clock size={16} />,
      label: 'Réserv.',
    },
    {
      key: 'reservations' as TabKey,
      icon: <ClipboardCheck size={16} />,
      label: 'Gestion résa',
    },
    {
      key: 'notifications' as TabKey,
      icon: <Bell size={16} />,
      label: 'Notifs',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
      <CommercialHeader
        user={user}
        onLogout={logout}
        onRefresh={refreshData}
        onNotificationsToggle={handleNotificationsToggle}
        onAdminToggle={
          features?.canManageAgents
            ? () => setIsAdminModalOpen(true)
            : undefined
        }
        onCatalogueToggle={() =>
          handleTabChange(activeTab === 'catalogue' ? 'dashboard' : 'catalogue')
        }
        onMapToggle={() =>
          handleTabChange(activeTab === 'map' ? 'dashboard' : 'map')
        }
        onExportToggle={async () => {
          try {
            const { generateReportPDF } = await import(
              './services/reportPdfService'
            );
            await generateReportPDF({
              panneaux: panneauxFiltres as any,
              stats,
              filters,
              user,
            });
          } catch (err) {
            console.error('❌ Erreur PDF:', err);
          }
        }}
        onReportsToggle={
          features?.canViewReports ? () => setIsReportsOpen(true) : undefined
        }
        onPredictionsToggle={
          features?.canViewPredictions
            ? () => setIsPredictionsOpen(true)
            : undefined
        }
        onTeamManagementToggle={
          features?.canManageTeam
            ? () => setIsTeamManagementOpen(true)
            : undefined
        }
        onReservationsManagementToggle={
          features?.canModifyReservations
            ? () => setIsReservationsManagementOpen(true)
            : undefined
        }
        notificationCount={unreadCount}
      />

      {/* Conteneur principal — largeur fluide du mobile au 4K */}
      <main className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pb-20 sm:pb-6">
        {/* 🧹 Bandeau de nettoyage */}
        <CleanupBanner
          status={cleanupStatus}
          onRetry={() => executerNettoyage(true)}
          onClose={() => setCleanupStatus({ kind: 'idle' })}
        />

        {/* ============================================
            ONGLETS — scroll horizontal sur mobile
            ============================================ */}
        <div className="flex gap-1 sm:gap-2 md:gap-4 mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`relative flex flex-row items-center gap-1 sm:gap-2 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 font-bold text-xs sm:text-sm transition border-b-2 whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="[&>svg]:w-4 [&>svg]:h-4">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.key === 'notifications' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ============================================
            ONGLET DASHBOARD
            ============================================ */}
        {activeTab === 'dashboard' && (
          <>
            {/* Toggle stats mobile */}
            <button
              onClick={() => setIsStatsExpanded((v) => !v)}
              className="lg:hidden w-full flex items-center justify-between px-4 py-3 mb-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm"
              aria-expanded={isStatsExpanded}
            >
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <BarChart3 size={16} className="text-blue-600" />
                <span>Statistiques</span>
                <span className="text-xs font-normal text-gray-500">
                  ({statsCards.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 hidden sm:inline">
                  {isStatsExpanded ? 'Masquer' : 'Afficher'}
                </span>
                {isStatsExpanded ? (
                  <ChevronUp size={16} className="text-blue-600" />
                ) : (
                  <ChevronDown size={16} className="text-blue-600" />
                )}
              </div>
            </button>

            {/* Grille stats responsive via CSS (voir globals.css) */}
            <div
              className={`stats-grid-6 mb-4 sm:mb-6 ${
                isStatsExpanded ? 'grid' : 'hidden lg:grid'
              }`}
            >
              {statsCards.map((card, index) => (
                <StatCard
                  key={index}
                  label={card.label}
                  value={card.value}
                  icon={card.icon}
                  color={card.color}
                  loading={loading}
                />
              ))}
            </div>

            <PanneauFilters
              filters={filters}
              onFiltersChange={setFilters}
              totalResults={panneauxFiltres.length}
              totalPanneaux={transformedPanneaux.length}
            />

            <PanneauxTable
              panneaux={panneauxFiltres as any}
              onFaceClick={openFaceDetails}
              onReserveClick={handleReserveClick}
              loading={loading}
            />
          </>
        )}

        {/* ============================================
            ONGLET CATALOGUE
            ============================================ */}
        {activeTab === 'catalogue' && (
          <div className="w-full">
            <CatalogueContent user={user} />
          </div>
        )}

        {/* ============================================
            ONGLET GESTION RÉSERVATIONS
            ============================================ */}
        {activeTab === 'reservations' && (
          <ReservationsManagementModal
            isOpen={true}
            onClose={() => handleTabChange('dashboard')}
            inline={true}
          />
        )}

        {/* ============================================
            ONGLET CARTE
            ============================================ */}
        {activeTab === 'map' && (
          <div className="w-full h-[55vh] sm:h-[60vh] md:h-[65vh] lg:h-[70vh] xl:h-[75vh] rounded-lg sm:rounded-xl overflow-hidden border-2 border-gray-200">
            <MapComponent
              panneaux={transformedPanneaux}
              reservationsMap={reservationsMap}
              userLocation={userLocation}
              locationError={locationError}
              onMarkerClick={handleMapMarkerClick}
              onReserveClick={handleMapReserveClick}
              onAddToCart={handleMapAddToCart}
            />
          </div>
        )}

        {/* ============================================
            ONGLET RÉSERVATIONS EN ATTENTE
            ============================================ */}
        {activeTab === 'pending' && <PendingReservationsTab user={user} />}

        {/* ============================================
            ONGLET NOTIFICATIONS
            ============================================ */}
        {activeTab === 'notifications' && <NotificationsTab user={user} />}
      </main>

      {/* ============================================
          MODALES
          ============================================ */}
      {isPanneauReservationsModalOpen && selectedPanneauForReservations && (
        <PanneauReservationsModal
          isOpen={isPanneauReservationsModalOpen}
          onClose={() => {
            setIsPanneauReservationsModalOpen(false);
            setSelectedPanneauForReservations(null);
          }}
          panneau={selectedPanneauForReservations as any}
          onReserveClick={handleReserveClick as any}
        />
      )}

      {isFaceModalOpen && selectedFaceId && (
        <FaceDetailModal
          isOpen={isFaceModalOpen}
          onClose={() => {
            setIsFaceModalOpen(false);
            setSelectedFaceId(null);
          }}
          faceId={selectedFaceId}
          onReserveClick={handleReserveClick as any}
        />
      )}

      {isReservationModalOpen && selectedPanneau && selectedFace && (
        <ReservationModal
          isOpen={isReservationModalOpen}
          onClose={() => {
            setIsReservationModalOpen(false);
            setSelectedPanneau(null);
            setSelectedFace(null);
          }}
          face={selectedFace as any}
          panneau={selectedPanneau as any}
          user={user}
          onSuccess={refreshData}
        />
      )}

      <CartPanel />

      <StatsPanel isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />

      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      <ReportsModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        panneaux={panneauxFiltres as any}
        stats={stats}
      />

      <PredictionsModal
        isOpen={isPredictionsOpen}
        onClose={() => setIsPredictionsOpen(false)}
        panneaux={panneauxFiltres as any}
        stats={stats}
      />

      <TeamManagementModal
        isOpen={isTeamManagementOpen}
        onClose={() => setIsTeamManagementOpen(false)}
      />

      <ReservationsManagementModal
        isOpen={isReservationsManagementOpen}
        onClose={() => setIsReservationsManagementOpen(false)}
      />
    </div>
  );
}

// ============================================
// ✅ EXPORT PAR DÉFAUT AVEC SUSPENSE
// ============================================
export default function CommercialDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <p className="mt-4 text-sm text-gray-500">
              Chargement du tableau de bord...
            </p>
          </div>
        </div>
      }
    >
      <CommercialDashboardInner />
    </Suspense>
  );
}