'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/dg/page.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
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
  // 👑 Imports premium (gardés pour versions futures)
  Crown, Sparkles, Star, Trophy, Gem,
  Briefcase, Building2, DollarSign, Zap, Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ✅ CHEMINS CORRIGÉS
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
        <div className="text-center px-4">
          <div className="w-14 h-14 sm:w-20 sm:h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80 text-sm sm:text-lg font-bold uppercase tracking-wider">Chargement...</p>
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
// 👑 COMPOSANTS PREMIUM — CONSERVÉS POUR VERSIONS FUTURES
// ============================================
// Décommenter ces composants + les appels dans activeTab === 'dashboard'
// quand on voudra réactiver le mode PDG Prestige.

/*
// 👑 BANDEAU PRESTIGE PDG
function PrestigeBanner({ userName }: { userName?: string }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const hour = time.getHours();
  const greeting =
    hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 border border-amber-500/30 shadow-xl mb-4 sm:mb-6"
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-400 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-emerald-400 blur-3xl" />
      </div>

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative shrink-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg ring-2 ring-amber-300/50">
              <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-950" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-emerald-900 rounded-full" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-serif font-bold text-white tracking-tight">
                {greeting}, Monsieur le Président
              </h1>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <p className="text-xs sm:text-sm text-amber-200/80 font-medium mt-0.5">
              Direction Générale · {time.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-white/90 uppercase tracking-wider">
              Système actif
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 backdrop-blur border border-amber-400/40">
            <Gem className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">
              VIP
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 📊 KPI STRATÉGIQUE PDG
function StrategicKPI({
  label, value, unit, trend, trendUp, icon, accent, delay = 0,
}: {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ReactNode;
  accent: 'emerald' | 'amber' | 'blue' | 'purple';
  delay?: number;
}) {
  const accents = {
    emerald: { bg: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-300/40', icon: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-200' },
    amber: { bg: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-300/40', icon: 'bg-amber-100 text-amber-700', ring: 'ring-amber-200' },
    blue: { bg: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-300/40', icon: 'bg-blue-100 text-blue-700', ring: 'ring-blue-200' },
    purple: { bg: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-300/40', icon: 'bg-purple-100 text-purple-700', ring: 'ring-purple-200' },
  };
  const a = accents[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`relative bg-gradient-to-br ${a.bg} bg-white rounded-2xl border ${a.border} shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 overflow-hidden`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 mt-1">
            {value}
            {unit && <span className="text-sm sm:text-base font-sans font-medium text-gray-500 ml-1">{unit}</span>}
          </p>
          {trend && (
            <div className={`inline-flex items-center gap-1 mt-2 text-[11px] font-bold ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
              <TrendingUp size={12} className={trendUp ? '' : 'rotate-180'} />
              {trend}
            </div>
          )}
        </div>
        <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${a.icon} flex items-center justify-center ring-4 ${a.ring}/40`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// 💎 CARTE INSIGHT PDG
function InsightCard({
  title, description, tone, icon,
}: {
  title: string;
  description: string;
  tone: 'success' | 'warning' | 'info';
  icon: React.ReactNode;
}) {
  const tones = {
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
  };
  const t = tones[tone];

  return (
    <div className={`${t.bg} ${t.border} border rounded-xl p-3.5 sm:p-4`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center ${t.text} shadow-sm`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
            <h4 className={`text-xs sm:text-sm font-bold ${t.text}`}>{title}</h4>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-600 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
*/

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
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-16 sm:p-24 text-center">
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
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-16 sm:p-24 text-center">
        <BellOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Aucune notification</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Notifications {unreadCount > 0 && (
            <span className="ml-2 text-xs px-2 py-0.5 bg-emerald-600 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllAsRead}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 whitespace-nowrap w-full sm:w-auto">
            <CheckCheck size={16} /> Tout marquer lu
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 divide-y divide-slate-100 overflow-hidden">
        {notifications.map((notif) => {
          const isExpanded = expandedId === notif.id;
          return (
            <div key={notif.id} className={notif.isRead ? 'bg-white' : 'bg-emerald-50/40'}>
              <button onClick={() => handleToggle(notif)}
                className="w-full text-left flex items-start gap-3 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900 text-sm sm:text-base break-words">
                      {notif.title || notif.titre || 'Notification'}
                    </p>
                    <motion.span animate={{ rotate: isExpanded ? 180 : 0 }}
                      className="flex-shrink-0 text-slate-400">
                      <ChevronDown size={16} />
                    </motion.span>
                  </div>
                  {!isExpanded && <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-1 break-words">{notif.message}</p>}
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
                    <div className="px-3 sm:px-6 pb-4 sm:pb-5 sm:pl-[72px]">
                      <div className="text-xs sm:text-sm text-slate-600 bg-slate-50 rounded-lg p-3 sm:p-4 border break-words">
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
    <div className={`mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 border rounded-lg px-3 sm:px-4 py-2 text-sm ${bg} ${text}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0">{icon}</span>
        <span className="break-words">{message}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
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

  const features = user ? getFeaturesByProfil(user.profil) : null;

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

  // ⚠️ Vérif rôle
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

  // ============================================
  // 📊 STATS : 6 cartes standards
  // ============================================
  const statsCards = [
    { label: 'Panneaux', value: stats.totalPanneaux, icon: <LayoutDashboard size={12} />, color: 'blue' as const },
    { label: 'Faces', value: stats.totalFaces, icon: <MapPin size={12} />, color: 'indigo' as const },
    { label: 'Libres', value: stats.totalLibres, icon: <FileText size={12} />, color: 'emerald' as const },
    { label: 'Occupées', value: stats.totalOccupes, icon: <Users size={12} />, color: 'blue' as const },
    { label: 'Réservées', value: stats.totalReserves, icon: <Calendar size={12} />, color: 'amber' as const },
    { label: 'Rés. Futures', value: stats.totalReservationsFutures || 0, icon: <BarChart3 size={12} />, color: 'purple' as const },
  ];

  const tauxOccupation = useMemo(() => {
    const total = (stats.totalLibres || 0) + (stats.totalOccupes || 0) + (stats.totalReserves || 0);
    if (total === 0) return 0;
    return Math.round((((stats.totalOccupes || 0) + (stats.totalReserves || 0)) / total) * 100);
  }, [stats]);

  // ============================================
  // 💎 KPIs STRATÉGIQUES — CONSERVÉS POUR VERSIONS FUTURES
  // ============================================
  /*
  const strategicKPIs = [
    {
      label: 'Chiffre d\'affaires estimé',
      value: (stats.totalReserves || 0) * 250,
      unit: 'USD',
      trend: '+12.5% vs mois dernier',
      trendUp: true,
      icon: <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />,
      accent: 'emerald' as const,
    },
    {
      label: 'Taux d\'occupation global',
      value: tauxOccupation,
      unit: '%',
      trend: tauxOccupation >= 75 ? 'Objectif atteint ✓' : 'Objectif 75%',
      trendUp: tauxOccupation >= 75,
      icon: <PieChart className="w-5 h-5 sm:w-6 sm:h-6" />,
      accent: 'amber' as const,
    },
    {
      label: 'Réservations futures',
      value: stats.totalReservationsFutures || 0,
      trend: 'Pipeline commercial',
      trendUp: true,
      icon: <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />,
      accent: 'blue' as const,
    },
    {
      label: 'Croissance annuelle',
      value: '+23.8',
      unit: '%',
      trend: 'Objectif +25%',
      trendUp: true,
      icon: <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />,
      accent: 'purple' as const,
    },
  ];
  */

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
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
        <div className="text-center max-w-md w-full">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4 break-words">{error}</p>
          <button onClick={refreshData} className="px-6 py-2 bg-emerald-600 text-white rounded-lg">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ✅ TABS : label complet sur desktop, court sur mobile
  const tabs = [
    { key: 'dashboard' as TabKey, icon: <LayoutDashboard size={16} />, label: 'Tableau de bord', shortLabel: 'Tableau' },
    { key: 'catalogue' as TabKey, icon: <span>📸</span>, label: 'Catalogue', shortLabel: 'Catalogue' },
    { key: 'map' as TabKey, icon: <Map size={16} />, label: 'Carte interactive', shortLabel: 'Carte' },
    { key: 'pending' as TabKey, icon: <Clock size={16} />, label: 'Réservations', shortLabel: 'Réserv.' },
    { key: 'notifications' as TabKey, icon: <Bell size={16} />, label: 'Notifications', shortLabel: 'Notifs' },
    { key: 'agents' as TabKey, icon: <Users size={16} />, label: 'Gestion des agents', shortLabel: 'Agents' },
  ];

  return (
    // ✅ STRUCTURE : flex-col + h-[100dvh]
    <div className="flex flex-col h-[100dvh] w-full bg-gray-50 overflow-hidden">
      {/* HEADER (shrink-0) */}
      <div className="shrink-0">
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
      </div>

      {/* TABS (shrink-0) */}
      <div className="shrink-0 bg-gray-50 border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <div className="flex gap-1 sm:gap-2 md:gap-4">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                className={`relative flex flex-row items-center gap-1 sm:gap-2 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 font-bold text-xs sm:text-sm transition border-b-2 whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.key ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <span className="[&>svg]:w-4 [&>svg]:h-4">{tab.icon}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.key === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ CONTENU PRINCIPAL — flex-1 min-h-0 */}
      <main className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3 sm:py-4 md:py-6">
          <CleanupBanner status={cleanupStatus} onRetry={() => executerNettoyage(true)} onClose={() => setCleanupStatus({ kind: 'idle' })} />

          {/* ============================================
              ONGLET DASHBOARD — VERSION STANDARD
              ============================================ */}
          {activeTab === 'dashboard' && (
            <>
              {/* 👑 ZONE PREMIUM — Décommenter pour activer le mode PDG Prestige
              <PrestigeBanner userName={user?.nom} />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {strategicKPIs.map((kpi, i) => (
                  <StrategicKPI key={i} {...kpi} delay={i * 0.08} />
                ))}
              </div>

              <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm sm:text-base font-serif font-bold text-gray-800">
                    Insights pour la Direction
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <InsightCard
                    tone="success"
                    icon={<Trophy className="w-4 h-4" />}
                    title="Performance excellente"
                    description={`Taux d'occupation à ${tauxOccupation}% — au-dessus de l'objectif stratégique trimestriel.`}
                  />
                  <InsightCard
                    tone="warning"
                    icon={<AlertTriangle className="w-4 h-4" />}
                    title="Points de vigilance"
                    description={`${panneauxFiltres.filter((p: any) => p.a_probleme).length || 0} panneau(x) signalé(s) en anomalie nécessitant intervention.`}
                  />
                  <InsightCard
                    tone="info"
                    icon={<Zap className="w-4 h-4" />}
                    title="Opportunité commerciale"
                    description={`${stats.totalLibres || 0} face(s) libre(s) à valoriser — potentiel de croissance immédiat.`}
                  />
                </div>
              </div>
              👑 FIN ZONE PREMIUM */}

              {/* Toggle stats mobile */}
              <button onClick={() => setIsStatsExpanded((v) => !v)}
                className="lg:hidden w-full flex items-center justify-between px-4 py-3 mb-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <BarChart3 size={16} className="text-emerald-600" />
                  <span>Statistiques</span>
                  <span className="text-xs font-normal text-gray-500">({statsCards.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 hidden sm:inline">
                    {isStatsExpanded ? 'Masquer' : 'Afficher'}
                  </span>
                  <ChevronDown size={16} className={`text-emerald-600 transition-transform ${isStatsExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <div className={`stats-grid-6 mb-4 sm:mb-6 ${isStatsExpanded ? 'grid' : 'hidden lg:grid'}`}>
                {statsCards.map((card, i) => (
                  <StatCard key={i} label={card.label} value={card.value} icon={card.icon} color={card.color} loading={loading} />
                ))}
              </div>

              <div className="w-full">
                <PanneauFilters filters={filters} onFiltersChange={setFilters}
                  totalResults={panneauxFiltres.length} totalPanneaux={transformedPanneaux.length} />

                <PanneauxTable panneaux={panneauxFiltres as any}
                  onFaceClick={openFaceDetails} onReserveClick={handleReserveClick} loading={loading} />
              </div>
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
              ONGLET RÉSERVATIONS EN ATTENTE
              ============================================ */}
          {activeTab === 'pending' && (
            <div className="w-full">
              <PendingReservationsTab user={user} />
            </div>
          )}

          {/* ============================================
              ONGLET NOTIFICATIONS
              ============================================ */}
          {activeTab === 'notifications' && (
            <div className="w-full">
              <NotificationsTab user={user} />
            </div>
          )}

          {/* ============================================
              ONGLET AGENTS
              ============================================ */}
          {activeTab === 'agents' && (
            <div className="w-full bg-white rounded-2xl shadow-lg border border-emerald-100 p-4 sm:p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" /> Gestion des agents
              </h3>
              <TeamManagementModal isOpen={true} onClose={() => handleTabChange('dashboard')} />
            </div>
          )}
        </div>

        {/* ============================================
            ONGLET CARTE — PLEIN ÉCRAN
            ============================================ */}
        {activeTab === 'map' && (
          <div className="w-full h-full">
            <MapComponent panneaux={transformedPanneaux} reservationsMap={reservationsMap}
              userLocation={userLocation} locationError={locationError}
              onMarkerClick={handleMapMarkerClick} onReserveClick={handleMapReserveClick}
              onAddToCart={handleMapAddToCart} />
          </div>
        )}
      </main>

      {/* ============================================
          MODALES
          ============================================ */}
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

// ============================================
// ✅ EXPORT PAR DÉFAUT AVEC SUSPENSE
// ============================================
export default function DGDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    }>
      <DGDashboardInner />
    </Suspense>
  );
}