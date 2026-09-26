'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/dg/page.tsximport React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, MapPin, Calendar, Users, BarChart3,
  Loader2, FileText, Map, Bell, AlertTriangle, Clock, BellOff,
  Target, Award, Globe, PieChart, TrendingUp, CheckCircle2,
  Info, CheckCheck, ArrowRight, ChevronDown, RefreshCw,
  Printer, FileCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ✅ CHEMINS CORRIGÉS : '../commercial/...' au lieu de '../../commercial/...'
import {
  loadReservationsByFace,
  ReservationsMap,
  createEmptyReservationsMap,
} from '../commercial/components/filters/reservationsLoader';

import { useCommercialData } from '../commercial/hooks/useCommercialData';
import { usePanneauxFilters } from '../commercial/hooks/usePanneauxFilters';
import { getFeaturesByProfil } from '../commercial/types/commercial.types';

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
} from '../commercial/components';

const MapComponent = dynamicImport(
  () => import('../commercial/components/MapComponent'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-900 to-emerald-950">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80 text-lg font-bold uppercase tracking-wider">Chargement...</p>
        </div>
      </div>
    ),
  }
);

import { PanneauFilters } from '../commercial/components/filters/PanneauFilters';
import { filterPanneaux } from '../commercial/components/filters/filterLogic';
import { PanneauFiltersState } from '../commercial/components/filters/types';

import { CommercialPanneau, CommercialFace } from '../commercial/types/commercial.types';

// ============================================
// TYPES
// ============================================
interface Notification {
  id: string | number;
  type: string;
  title?: string;
  titre?: string;
  message: string;
  lien?: string | null;
  isRead: boolean;
  createdAt: string;
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
  | 'proformat'
  | 'agents'
  | 'strategie';

// ============================================
// NotificationsTab
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
        const res = await fetch('/api/commercials/notifications', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
        const data = await res.json();
        setNotifications(data.data || data.notifications || data || []);
      } catch (err: any) {
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
        method: 'POST', credentials: 'include',
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) { console.error(err); }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/commercials/notifications/mark-all', {
        method: 'POST', credentials: 'include',
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) { console.error(err); }
  };

  const handleToggle = (notif: Notification) => {
    const isOpening = expandedId !== notif.id;
    setExpandedId(isOpening ? notif.id : null);
    if (isOpening && !notif.isRead) handleMarkAsRead(notif.id);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-24 text-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-12 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-600 font-bold">Erreur: {error}</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-24 text-center">
        <BellOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Aucune notification</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Notifications {unreadCount > 0 && (
            <span className="ml-2 text-xs px-2 py-0.5 bg-emerald-600 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100">
            <CheckCheck size={16} /> Tout marquer lu
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 divide-y divide-slate-100">
        {notifications.map((notif) => {
          const isExpanded = expandedId === notif.id;
          return (
            <div key={notif.id} className={notif.isRead ? 'bg-white' : 'bg-emerald-50/40'}>
              <button onClick={() => handleToggle(notif)}
                className="w-full text-left flex items-start gap-4 px-6 py-4 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-slate-900">{notif.title || notif.titre || 'Notification'}</p>
                    <motion.span animate={{ rotate: isExpanded ? 180 : 0 }}>
                      <ChevronDown size={16} />
                    </motion.span>
                  </div>
                  {!isExpanded && <p className="text-sm text-slate-500 mt-1 line-clamp-1">{notif.message}</p>}
                </div>
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 pl-[72px]">
                      <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4 border">
                        {notif.message}
                      </div>
                      {notif.lien && (
                        <button onClick={() => router.push(notif.lien!)}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                          Voir le détail <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// CleanupBanner
// ============================================
function CleanupBanner({ status, onRetry, onClose }: {
  status: CleanupStatus; onRetry: () => void; onClose: () => void;
}) {
  if (status.kind === 'idle' || status.kind === 'running') return null;
  let bg = 'bg-slate-50 border-slate-200', text = 'text-slate-700',
      icon = <Info className="w-4 h-4" />, message = '';
  if (status.kind === 'success') {
    bg = 'bg-emerald-50 border-emerald-200'; text = 'text-emerald-800';
    icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    message = `Nettoyage réussi — ${status.terminees} terminée(s), ${status.expirees} expirée(s).`;
  } else if (status.kind === 'empty') {
    bg = 'bg-blue-50 border-blue-200'; text = 'text-blue-800';
    icon = <Info className="w-4 h-4 text-blue-600" />;
    message = 'Aucune réservation à nettoyer.';
  } else if (status.kind === 'error') {
    bg = 'bg-red-50 border-red-200'; text = 'text-red-800';
    icon = <AlertTriangle className="w-4 h-4 text-red-600" />;
    message = `Erreur de nettoyage : ${status.message}`;
  }
  return (
    <div className={`mt-3 flex items-center justify-between gap-3 border rounded-lg px-4 py-2 text-sm ${bg} ${text}`}>
      <div className="flex items-center gap-2">{icon}<span>{message}</span></div>
      <div className="flex items-center gap-2">
        <button onClick={onRetry}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/60 text-xs font-bold border">
          <RefreshCw size={12} /> Relancer
        </button>
        <button onClick={onClose} className="text-xs font-bold underline">Fermer</button>
      </div>
    </div>
  );
}

// ============================================
// Onglet PROFORMAT
// ============================================
function ProformatTab({ user, panneaux }: { user: any; panneaux: any[] }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileCheck className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-800">Gestion des Proformats</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Sélectionnez des réservations dans le panier pour générer un proformat imprimable.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
            <p className="text-xs font-bold text-emerald-600 uppercase">Proformats disponibles</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{panneaux.length}</p>
            <p className="text-xs text-emerald-600">Panneaux actifs</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <p className="text-xs font-bold text-blue-600 uppercase">Statut</p>
            <p className="text-lg font-bold text-blue-700 mt-1">Prêt</p>
            <p className="text-xs text-blue-600">Accès complet</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
            <p className="text-xs font-bold text-amber-600 uppercase">Impressions</p>
            <p className="text-lg font-bold text-amber-700 mt-1">Illimitées</p>
            <p className="text-xs text-amber-600">Autorisation DG</p>
          </div>
        </div>

        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
          <p className="text-sm font-bold text-emerald-800 mb-2">💡 Comment créer un proformat :</p>
          <ol className="list-decimal list-inside text-sm text-emerald-700 space-y-1">
            <li>Allez dans l'onglet <strong>Catalogue</strong> ou <strong>Tableau</strong></li>
            <li>Cliquez sur une face libre → <strong>Ajouter au panier</strong></li>
            <li>Ouvrez le <strong>Panier</strong> (icône en haut à droite)</li>
            <li>Cliquez sur <strong>Générer Proformat</strong></li>
            <li>Vous serez redirigé vers la page d'impression ✅</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DGDashboardInner
// ============================================
function DGDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const { addItem } = useCart();
  const { panneaux, loading, error, refresh } = useCommercialData();
  const { stats } = usePanneauxFilters({ panneaux });

  const [filters, setFilters] = useState<PanneauFiltersState>(DEFAULT_FILTERS);
  const [reservationsMap, setReservationsMap] = useState<ReservationsMap>(createEmptyReservationsMap());

  // ✅ features : DG = mêmes droits que CHEF_COMMERCIAL
  const features = user ? getFeaturesByProfil(user.profil) : null;

  // ✅ Onglet persistant dans l'URL
  const initialTab = (searchParams.get('tab') as TabKey) || 'dashboard';
  const validTabs: TabKey[] = [
    'dashboard', 'catalogue', 'map', 'pending', 'notifications', 'proformat', 'agents', 'strategie',
  ];
  const [activeTab, setActiveTab] = useState<TabKey>(
    validTabs.includes(initialTab) ? initialTab : 'dashboard'
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
  const [cleanupStatus, setCleanupStatus] = useState<CleanupStatus>({ kind: 'idle' });

  // États UI
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isPredictionsOpen, setIsPredictionsOpen] = useState(false);
  const [isTeamManagementOpen, setIsTeamManagementOpen] = useState(false);
  const [isReservationsManagementOpen, setIsReservationsManagementOpen] = useState(false);

  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [selectedPanneau, setSelectedPanneau] = useState<CommercialPanneau | null>(null);
  const [selectedFace, setSelectedFace] = useState<CommercialFace | null>(null);

  const [isPanneauReservationsModalOpen, setIsPanneauReservationsModalOpen] = useState(false);
  const [selectedPanneauForReservations, setSelectedPanneauForReservations] = useState<CommercialPanneau | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // ⚠️ Vérif rôle : DG UNIQUEMENT
  useEffect(() => {
    if (user && user.profil !== 'DG' && user.profil !== 'SUPER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/commercials/notifications', {
        credentials: 'include', cache: 'no-store',
      });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : data.data || data.notifications || []);
    } catch (err) {
      console.error('❌ notif:', err);
      setNotifications([]);
    }
  }, [user]);

  const reloadReservationsMap = useCallback(async () => {
    try {
      const map = await loadReservationsByFace();
      setReservationsMap(map);
    } catch (err) { console.error('❌ réservations:', err); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadReservationsByFace().then((map) => {
      if (!cancelled) setReservationsMap(map);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    if (notificationIntervalRef.current) clearInterval(notificationIntervalRef.current);
    notificationIntervalRef.current = setInterval(loadNotifications, 30000);
    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
        notificationIntervalRef.current = null;
      }
    };
  }, [user, loadNotifications]);

  // 🧹 Nettoyage auto
  const executerNettoyage = useCallback(async (force = false) => {
    const dejaFait = sessionStorage.getItem('nettoyage_reservations_fait');
    if (!force && dejaFait) return;
    setCleanupStatus({ kind: 'running' });
    try {
      const response = await fetch('/api/reservations/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cleanup-Token': 'mon-token-securise-123456' },
        credentials: 'include',
        body: JSON.stringify({ batch: 50 }),
      });
      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}${txt ? ' — ' + txt.slice(0, 120) : ''}`);
      }
      const result = await response.json();
      const terminees = Number(result?.data?.terminees ?? 0);
      const expirees = Number(result?.data?.expirees ?? 0);
      if (terminees === 0 && expirees === 0) setCleanupStatus({ kind: 'empty' });
      else {
        setCleanupStatus({ kind: 'success', terminees, expirees });
        refresh();
        reloadReservationsMap();
      }
      sessionStorage.setItem('nettoyage_reservations_fait', 'true');
    } catch (err: any) {
      setCleanupStatus({ kind: 'error', message: err?.message || 'Erreur inconnue' });
    }
  }, [refresh, reloadReservationsMap]);

  useEffect(() => {
    const t = setTimeout(() => executerNettoyage(false), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setLocationError('GPS non supporté'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError('GPS non disponible'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const openFaceDetails = (panneau: CommercialPanneau, face: CommercialFace) => {
    const faceId = typeof face.id_face === 'number' ? face.id_face : parseInt(face.id_face.toString() || '0');
    setSelectedFaceId(faceId);
    setIsFaceModalOpen(true);
  };

  const handleReserveClick = (panneau: CommercialPanneau, face?: CommercialFace) => {
    if (face) {
      setSelectedPanneau(panneau); setSelectedFace(face); setIsReservationModalOpen(true);
    } else {
      setSelectedPanneauForReservations(panneau); setIsPanneauReservationsModalOpen(true);
    }
  };

  const refreshData = useCallback(async () => {
    await Promise.all([Promise.resolve(refresh()), reloadReservationsMap(), loadNotifications()]);
  }, [refresh, reloadReservationsMap, loadNotifications]);

  const handleMapMarkerClick = (panneau: any) => {
    setSelectedPanneau(panneau); setIsPanneauReservationsModalOpen(true);
  };
  const handleMapReserveClick = (panneau: any, face?: any) => {
    if (face) { setSelectedPanneau(panneau); setSelectedFace(face); setIsReservationModalOpen(true); }
    else { setSelectedPanneau(panneau); setIsPanneauReservationsModalOpen(true); }
  };
  const handleMapAddToCart = (panneau: any, face?: any) => {
    if (!face) return;
    addItem({
      id_face: face.id_face, id_panneau: panneau.id_panneau || panneau.id,
      panneau_nom: panneau.nom || 'Panneau', panneau_adresse: panneau.adresse || 'Adresse',
      orientation: face.orientation || 'N/A', type_face: face.type_face || 'Standard',
      dimension_m2: 'N/A', statut: face.status || 'Libre', prix_saisi: 0, currency: 'CDF' as const,
    });
  };

  const statsCards = [
    { label: 'Panneaux', value: stats.totalPanneaux, icon: <LayoutDashboard size={12} />, color: 'blue' as const },
    { label: 'Faces', value: stats.totalFaces, icon: <MapPin size={12} />, color: 'indigo' as const },
    { label: 'Libres', value: stats.totalLibres, icon: <FileText size={12} />, color: 'emerald' as const },
    { label: 'Occupées', value: stats.totalOccupes, icon: <Users size={12} />, color: 'blue' as const },
    { label: 'Réservées', value: stats.totalReserves, icon: <Calendar size={12} />, color: 'amber' as const },
    { label: 'Rés. Futures', value: stats.totalReservationsFutures || 0, icon: <BarChart3 size={12} />, color: 'purple' as const },
  ];

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

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
      commune: p.commune || '', province: p.province || '', ville: p.ville || '',
    }));
  }, [panneaux]);

  const panneauxFiltres = useMemo(
    () => filterPanneaux(transformedPanneaux, filters, reservationsMap),
    [transformedPanneaux, filters, reservationsMap]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={refreshData} className="px-6 py-2 bg-emerald-600 text-white rounded-lg">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CommercialHeader
        user={user}
        onLogout={logout}
        onRefresh={refreshData}
        onNotificationsToggle={() => handleTabChange('notifications')}
        onAdminToggle={features?.canManageAgents ? () => setIsAdminModalOpen(true) : undefined}
        onCatalogueToggle={() => handleTabChange(activeTab === 'catalogue' ? 'dashboard' : 'catalogue')}
        onMapToggle={() => handleTabChange(activeTab === 'map' ? 'dashboard' : 'map')}
        onExportToggle={async () => {
          try {
            const { generateReportPDF } = await import('../commercial/services/reportPdfService');
            await generateReportPDF({ panneaux: panneauxFiltres as any, stats, filters, user });
          } catch (err) { console.error('❌ PDF:', err); }
        }}
        onReportsToggle={features?.canViewReports ? () => setIsReportsOpen(true) : undefined}
        onPredictionsToggle={features?.canViewPredictions ? () => setIsPredictionsOpen(true) : undefined}
        onTeamManagementToggle={features?.canManageTeam ? () => setIsTeamManagementOpen(true) : undefined}
        onReservationsManagementToggle={features?.canModifyReservations ? () => setIsReservationsManagementOpen(true) : undefined}
        notificationCount={unreadCount}
      />

      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <CleanupBanner status={cleanupStatus} onRetry={() => executerNettoyage(true)} onClose={() => setCleanupStatus({ kind: 'idle' })} />

        {/* Onglets */}
        <div className="flex gap-1 sm:gap-4 mb-4 border-b border-gray-200 overflow-x-auto">
          {[
            { key: 'dashboard' as TabKey, icon: <LayoutDashboard size={16} />, label: 'Tableau' },
            { key: 'catalogue' as TabKey, icon: <span>📸</span>, label: 'Catalogue' },
            { key: 'map' as TabKey, icon: <Map size={16} />, label: 'Carte' },
            { key: 'pending' as TabKey, icon: <Clock size={16} />, label: 'Réserv.' },
            { key: 'proformat' as TabKey, icon: <Printer size={16} />, label: 'Proformat' },
            { key: 'notifications' as TabKey, icon: <Bell size={16} />, label: 'Notifs' },
            { key: 'agents' as TabKey, icon: <Users size={16} />, label: 'Agents' },
            { key: 'strategie' as TabKey, icon: <Target size={16} />, label: 'Stratégie' },
          ].map((tab) => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 sm:px-6 py-2 sm:py-3 font-bold text-[10px] sm:text-sm transition border-b-2 whitespace-nowrap ${
                activeTab === tab.key ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.icon}
              <span>{tab.label}</span>
              {tab.key === 'notifications' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <>
            <button onClick={() => setIsStatsExpanded((v) => !v)}
              className="lg:hidden w-full flex items-center justify-between px-3 py-2 mb-2 bg-white border rounded-lg">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <BarChart3 size={16} className="text-emerald-600" />
                Statistiques
              </div>
              <ChevronDown size={16} className={isStatsExpanded ? 'rotate-180' : ''} />
            </button>

            <div className={`stats-grid-6 mb-3 ${isStatsExpanded ? 'grid' : 'hidden'} lg:grid lg:!grid`}>
              {statsCards.map((card, i) => (
                <StatCard key={i} label={card.label} value={card.value} icon={card.icon} color={card.color} loading={loading} />
              ))}
            </div>

            <PanneauFilters filters={filters} onFiltersChange={setFilters}
              totalResults={panneauxFiltres.length} totalPanneaux={transformedPanneaux.length} />

            <PanneauxTable panneaux={panneauxFiltres as any}
              onFaceClick={openFaceDetails} onReserveClick={handleReserveClick} loading={loading} />
          </>
        )}

        {activeTab === 'catalogue' && <CatalogueContent user={user} />}

        {activeTab === 'map' && (
          <div className="h-[50vh] sm:h-[60vh] lg:h-[70vh] rounded-xl overflow-hidden border-2 border-gray-200">
            <MapComponent panneaux={transformedPanneaux} reservationsMap={reservationsMap}
              userLocation={userLocation} locationError={locationError}
              onMarkerClick={handleMapMarkerClick} onReserveClick={handleMapReserveClick}
              onAddToCart={handleMapAddToCart} />
          </div>
        )}

        {activeTab === 'pending' && <PendingReservationsTab user={user} />}

        {activeTab === 'proformat' && <ProformatTab user={user} panneaux={transformedPanneaux} />}

        {activeTab === 'notifications' && <NotificationsTab user={user} />}

        {activeTab === 'agents' && (
          <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" /> Gestion des agents
            </h3>
            <TeamManagementModal isOpen={true} onClose={() => handleTabChange('dashboard')} />
          </div>
        )}

        {activeTab === 'strategie' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-6 h-6 text-emerald-600" />
                <h3 className="font-bold text-emerald-700">Objectifs 2026</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>🎯 Croissance: +25%</li>
                <li>🎯 Nouveaux clients: 15</li>
                <li>🎯 Innovation digitale</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-blue-700">Indicateurs</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Taux d'occupation: 85%</li>
                <li>• Satisfaction: 95%</li>
                <li>• ROI: 30%</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {isPanneauReservationsModalOpen && selectedPanneauForReservations && (
        <PanneauReservationsModal isOpen={isPanneauReservationsModalOpen}
          onClose={() => { setIsPanneauReservationsModalOpen(false); setSelectedPanneauForReservations(null); }}
          panneau={selectedPanneauForReservations as any} onReserveClick={handleReserveClick as any} />
      )}

      {isFaceModalOpen && selectedFaceId && (
        <FaceDetailModal isOpen={isFaceModalOpen}
          onClose={() => { setIsFaceModalOpen(false); setSelectedFaceId(null); }}
          faceId={selectedFaceId} onReserveClick={handleReserveClick as any} />
      )}

      {isReservationModalOpen && selectedPanneau && selectedFace && (
        <ReservationModal isOpen={isReservationModalOpen}
          onClose={() => { setIsReservationModalOpen(false); setSelectedPanneau(null); setSelectedFace(null); }}
          face={selectedFace as any} panneau={selectedPanneau as any} user={user} onSuccess={refreshData} />
      )}

      <CartPanel />
      <StatsPanel isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />
      <AdminModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
      <ReportsModal isOpen={isReportsOpen} onClose={() => setIsReportsOpen(false)} panneaux={panneauxFiltres as any} stats={stats} />
      <PredictionsModal isOpen={isPredictionsOpen} onClose={() => setIsPredictionsOpen(false)} panneaux={panneauxFiltres as any} stats={stats} />
      <ReservationsManagementModal isOpen={isReservationsManagementOpen} onClose={() => setIsReservationsManagementOpen(false)} />
    </div>
  );
}

export default function DGDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    }>
      <DGDashboardInner />
    </Suspense>
  );
}