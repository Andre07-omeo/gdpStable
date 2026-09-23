// src/app/dashboard/commercial/page.tsx

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
      <div className="text-center">
        <div className="w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/80 text-lg font-bold uppercase tracking-wider">
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

// ✅ Type Notification
interface Notification {
  id: string | number;
  type: string;
  title: string;
  message: string;
  lien?: string | null;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

// ✅ Filtres par défaut
const DEFAULT_FILTERS: PanneauFiltersState = {
  search: '',
  situation: 'tous',
  faceSituation: 'tous',
  echeanceActive: false,
  echeanceDebut: '',
  echeanceFin: '',
};

// ============================================
// PAGE PRINCIPALE
// ============================================
export default function CommercialDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { addItem } = useCart();
  const { panneaux, loading, error, refresh } = useCommercialData();

  const { stats } = usePanneauxFilters({ panneaux });

  const [filters, setFilters] = useState<PanneauFiltersState>(DEFAULT_FILTERS);

  const [reservationsMap, setReservationsMap] = useState<ReservationsMap>(
    createEmptyReservationsMap()
  );

  const features = user ? getFeaturesByProfil(user.profil) : null;

  // ✅ Plus d'onglet "notifications" (page séparée)
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'catalogue' | 'map' | 'pending'
  >('dashboard');

  const [isStatsExpanded, setIsStatsExpanded] = useState(false);

  // ============================================
  // 🔔 NOTIFICATIONS (compteur uniquement)
  // ============================================
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // États UI
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isPredictionsOpen, setIsPredictionsOpen] = useState(false);
  const [isTeamManagementOpen, setIsTeamManagementOpen] = useState(false);
  const [isReservationsManagementOpen, setIsReservationsManagementOpen] =
    useState(false);

  // Réservations
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [selectedPanneau, setSelectedPanneau] =
    useState<CommercialPanneau | null>(null);
  const [selectedFace, setSelectedFace] = useState<CommercialFace | null>(null);

  const [isPanneauReservationsModalOpen, setIsPanneauReservationsModalOpen] =
    useState(false);
  const [selectedPanneauForReservations, setSelectedPanneauForReservations] =
    useState<CommercialPanneau | null>(null);

  // GPS
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // ============================================
  // 🔔 CHARGER LES NOTIFICATIONS (juste le compteur)
  // ============================================
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/commercials/notifications', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('❌ Erreur chargement notifications:', err);
      setNotifications([]);
    }
  }, [user]);

  // ============================================
  // ✅ CHARGER LES RÉSERVATIONS PAR FACE
  // ============================================
  useEffect(() => {
    let cancelled = false;
    loadReservationsByFace().then((map) => {
      if (!cancelled) setReservationsMap(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================
  // 🔔 Charger les notifications au montage
  // ============================================
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // ============================================
  // 🧹 NETTOYAGE AUTOMATIQUE DES RÉSERVATIONS
  // ============================================
  const [nettoyageEnCours, setNettoyageEnCours] = useState(false);

  useEffect(() => {
    const nettoyageFait = sessionStorage.getItem('nettoyage_reservations_fait');
    if (nettoyageFait) return;

    let cancelled = false;

    async function executerNettoyage() {
      if (nettoyageEnCours) return;
      setNettoyageEnCours(true);

      try {
        const response = await fetch('/api/reservations/clean', {
          method: 'POST',
          headers: {
            'X-Cleanup-Token':
              process.env.NEXT_PUBLIC_CLEANUP_TOKEN ||
              'mon-token-securise-123456',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ batch: 50 }),
        });

        if (response.ok) {
          const result = await response.json();
          sessionStorage.setItem('nettoyage_reservations_fait', 'true');
          if (result.data?.terminees > 0 || result.data?.expirees > 0) {
            refresh();
          }
        }
      } catch {
        // silencieux
      } finally {
        if (!cancelled) setNettoyageEnCours(false);
      }
    }

    const timer = setTimeout(executerNettoyage, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [refresh, nettoyageEnCours]);

  // ============================================
  // 📍 GPS
  // ============================================
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

  // ============================================
  // Handlers UI
  // ============================================
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

  // ✅ Refresh global
  const refreshData = useCallback(async (): Promise<void> => {
    refresh();
    await loadNotifications();
  }, [refresh, loadNotifications]);

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

  // ============================================
  // ✅ Ouvre la page notifications dédiée
  // ============================================
  const handleNotificationsToggle = () => {
    router.push('/dashboard/commercial/notifications');
  };

  // ============================================
  // Cartes stats
  // ============================================
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

  // ✅ unreadCount mémoïsé
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // ✅ Transformation des panneaux pour la carte
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

  // ✅ Application des filtres
  const panneauxFiltres = useMemo(() => {
    return filterPanneaux(transformedPanneaux, filters, reservationsMap);
  }, [transformedPanneaux, filters, reservationsMap]);

  // ============================================
  // 🔒 Écrans de chargement
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Erreur de chargement
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
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
        onRefresh={refresh}
        onNotificationsToggle={handleNotificationsToggle}
        onAdminToggle={
          features?.canManageAgents
            ? () => setIsAdminModalOpen(true)
            : undefined
        }
        onCatalogueToggle={() =>
          setActiveTab(activeTab === 'catalogue' ? 'dashboard' : 'catalogue')
        }
        onMapToggle={() =>
          setActiveTab(activeTab === 'map' ? 'dashboard' : 'map')
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

      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 pb-20 sm:pb-6">
        {/* ============================================
            Onglets
            ============================================ */}
        <div className="flex gap-1 sm:gap-4 mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          {[
            {
              key: 'dashboard',
              icon: <LayoutDashboard size={16} />,
              label: 'Tableau',
            },
            { key: 'catalogue', icon: <span>📸</span>, label: 'Catalogue' },
            { key: 'map', icon: <Map size={16} />, label: 'Carte' },
            { key: 'pending', icon: <Clock size={16} />, label: 'Réserv.' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 sm:px-6 py-2 sm:py-3 font-bold text-[10px] sm:text-sm transition border-b-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ============================================
            Contenu
            ============================================ */}
        {activeTab === 'dashboard' && (
          <>
            {/* Bouton statistiques repliable (mobile) */}
            <button
              onClick={() => setIsStatsExpanded((v) => !v)}
              className="lg:hidden w-full flex items-center justify-between px-3 py-2 mb-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm"
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
                <span className="text-xs text-gray-500">
                  {isStatsExpanded ? 'Masquer' : 'Afficher'}
                </span>
                {isStatsExpanded ? (
                  <ChevronUp size={16} className="text-blue-600" />
                ) : (
                  <ChevronDown size={16} className="text-blue-600" />
                )}
              </div>
            </button>

            <div
              className={`stats-grid-6 mb-3 ${
                isStatsExpanded ? 'grid' : 'hidden'
              } lg:grid lg:!grid`}
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

        {activeTab === 'catalogue' && <CatalogueContent user={user} />}

        {activeTab === 'map' && (
          <div className="h-[50vh] sm:h-[60vh] lg:h-[70vh] rounded-xl overflow-hidden border-2 border-gray-200">
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

        {activeTab === 'pending' && <PendingReservationsTab user={user} />}
      </main>

      {/* ============================================
          Modals
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