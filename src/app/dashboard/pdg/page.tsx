// src/app/dashboard/pdg/page.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamicImport from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, MapPin, Calendar, Users, BarChart3,
  Loader2, FileText, Map, Bell, AlertTriangle, Clock, BellOff,
  Target, Award, Globe, PieChart, TrendingUp,
} from 'lucide-react';
import {
  loadReservationsByFace,
  ReservationsMap,
  createEmptyReservationsMap,
} from '../commercial/components/filters/reservationsLoader';

// ============================================
// HOOKS (réutilisés du commercial)
// ============================================
import { useCommercialData } from '../commercial/hooks/useCommercialData';
import { usePanneauxFilters } from '../commercial/hooks/usePanneauxFilters';
import { getFeaturesByProfil } from '../commercial/types/commercial.types';

// ============================================
// COMPOSANTS commercial (réutilisés)
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
} from '../commercial/components';

// ============================================
// ✅ CARTE : chargement dynamique SANS SSR
// ============================================
const MapComponent = dynamicImport(
  () => import('../commercial/components/MapComponent'),
  {
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
  }
);

// ============================================
// FILTRES
// ============================================
import { PanneauFilters } from '../commercial/components/filters/PanneauFilters';
import { filterPanneaux } from '../commercial/components/filters/filterLogic';
import { PanneauFiltersState } from '../commercial/components/filters/types';

// ============================================
// TYPES
// ============================================
import { CommercialPanneau, CommercialFace } from '../commercial/types/commercial.types';

const DEFAULT_FILTERS: PanneauFiltersState = {
  search: '',
  situation: 'tous',
  faceSituation: 'tous',
  echeanceActive: false,
  echeanceDebut: '',
  echeanceFin: '',
};

// ============================================
// 🎯 TAB CONTENT — Notifications
// ============================================
function NotificationsTabContent({ notifications, onMarkAsRead, onMarkAllAsRead }: any) {
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const getNotificationIcon = (notif: any) => {
    if (notif.type === 'critical' || notif.joursRestants <= 3)
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (notif.type === 'warning' || notif.joursRestants <= 7)
      return <Clock className="w-5 h-5 text-amber-500" />;
    return <Bell className="w-5 h-5 text-blue-500" />;
  };

  const getNotificationColor = (notif: any) => {
    if (notif.type === 'critical' || notif.joursRestants <= 3)
      return 'bg-red-50 border-red-200 hover:border-red-300';
    if (notif.type === 'warning' || notif.joursRestants <= 7)
      return 'bg-amber-50 border-amber-200 hover:border-amber-300';
    return 'bg-blue-50 border-blue-200 hover:border-blue-300';
  };

  const getStatusBadge = (notif: any) => {
    if (notif.type === 'critical' || notif.joursRestants <= 3)
      return <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold animate-pulse">⚠️ URGENT</span>;
    if (notif.type === 'warning' || notif.joursRestants <= 7)
      return <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">🔔 Attention</span>;
    return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">ℹ️ Info</span>;
  };

  if (notifications.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-12 text-center">
        <BellOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium text-lg">Aucune notification</p>
        <p className="text-sm text-gray-400">Toutes vos réservations sont à jour</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-800">🔔 Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold animate-pulse">
              {unreadCount} non lue(s)
            </span>
          )}
        </div>
        {onMarkAllAsRead && unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition"
          >
            Tout marquer lu
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((notif: any, idx: number) => (
          <div
            key={idx}
            className={`p-4 border rounded-xl hover:shadow-md transition cursor-pointer ${getNotificationColor(notif)} ${!notif.isRead ? 'border-l-4 border-l-blue-500' : ''}`}
            onClick={() => onMarkAsRead && onMarkAsRead(notif.id)}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg flex-shrink-0 ${
                notif.type === 'critical' || notif.joursRestants <= 3
                  ? 'bg-red-100'
                  : notif.type === 'warning' || notif.joursRestants <= 7
                  ? 'bg-amber-100'
                  : 'bg-blue-100'
              }`}>
                {getNotificationIcon(notif)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-bold text-gray-800 truncate">
                    {notif.societeLocatrice || notif.client_nom || notif.client?.nom || 'Client'}
                  </p>
                  {getStatusBadge(notif)}
                </div>
                <p className="text-sm text-gray-600">
                  {notif.panneau_nom || notif.panneau?.nom || notif.panneauNom || `Panneau ${notif.panneau_id}`}
                  {notif.face_orientation && ` - Face ${notif.face_orientation}`}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                  {notif.date_debut && notif.date_fin && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(notif.date_debut).toLocaleDateString()} → {new Date(notif.date_fin).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold mt-1">
                  {notif.joursRestants !== undefined && (
                    <span className={
                      notif.joursRestants <= 3 ? 'text-red-600'
                      : notif.joursRestants <= 7 ? 'text-amber-600'
                      : 'text-blue-600'
                    }>
                      {notif.joursRestants} jour{notif.joursRestants > 1 ? 's' : ''} restant{notif.joursRestants > 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// 🎯 PAGE PRINCIPALE PDG
// ============================================
export default function PDGDashboard() {
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
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'catalogue' | 'map' | 'pending' | 'notifications' | 'strategie'
  >('dashboard');

  // États UI
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isReportsOpen, setIsReportsOpen] = useState<boolean>(false);
  const [isPredictionsOpen, setIsPredictionsOpen] = useState<boolean>(false);
  const [isTeamManagementOpen, setIsTeamManagementOpen] = useState<boolean>(false);
  const [isReservationsManagementOpen, setIsReservationsManagementOpen] = useState<boolean>(false);

  const [isReservationModalOpen, setIsReservationModalOpen] = useState<boolean>(false);
  const [selectedPanneau, setSelectedPanneau] = useState<CommercialPanneau | null>(null);
  const [selectedFace, setSelectedFace] = useState<CommercialFace | null>(null);

  const [isPanneauReservationsModalOpen, setIsPanneauReservationsModalOpen] = useState<boolean>(false);
  const [selectedPanneauForReservations, setSelectedPanneauForReservations] = useState<CommercialPanneau | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Charger les réservations par face
  useEffect(() => {
    loadReservationsByFace().then((map) => {
      console.log('✅ Réservations chargées (PDG):', map.size, 'faces');
      setReservationsMap(map);
    });
  }, []);

  // GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocationError('GPS non disponible'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const handleMarkAsRead = (id: string) => console.log('Notif lue:', id);
  const handleMarkAllAsRead = () => console.log('Toutes lues');

  const openFaceDetails = (panneau: CommercialPanneau, face: CommercialFace): void => {
    const faceId = typeof face.id_face === 'number'
      ? face.id_face
      : parseInt(face.id_face.toString() || '0');
    setSelectedFaceId(faceId);
    setIsFaceModalOpen(true);
  };

  const handleReserveClick = (panneau: CommercialPanneau, face?: CommercialFace): void => {
    if (face) {
      setSelectedPanneau(panneau);
      setSelectedFace(face);
      setIsReservationModalOpen(true);
    } else {
      setSelectedPanneauForReservations(panneau);
      setIsPanneauReservationsModalOpen(true);
    }
  };

  const refreshData = (): void => { refresh(); };

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
    if (face) {
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
    }
  };

  // Stats cards
  const statsCards = [
    { label: 'Panneaux', value: stats.totalPanneaux, icon: <LayoutDashboard size={16} />, color: 'blue' as const },
    { label: 'Faces', value: stats.totalFaces, icon: <MapPin size={16} />, color: 'indigo' as const },
    { label: 'Libres', value: stats.totalLibres, icon: <FileText size={16} />, color: 'emerald' as const },
    { label: 'Occupées', value: stats.totalOccupes, icon: <Users size={16} />, color: 'blue' as const },
    { label: 'Réservées', value: stats.totalReserves, icon: <Calendar size={16} />, color: 'amber' as const },
    { label: 'CA Total', value: '245K $', icon: <TrendingUp size={16} />, color: 'purple' as const },
  ];

  // Notifications démo (à remplacer par API plus tard)
  const notifications: any[] = [
    { id: '1', isRead: false, type: 'critical', joursRestants: 2, societeLocatrice: 'Société Générale de Publicité', panneau_nom: 'Panneau Central Gombe', face_orientation: 'NORD', date_debut: '2026-08-19', date_fin: '2026-09-17' },
    { id: '2', isRead: false, type: 'warning', joursRestants: 5, societeLocatrice: 'Medias Congo', panneau_nom: 'Panneau Kalamu', face_orientation: 'SUD', date_debut: '2026-08-28', date_fin: '2026-10-17' },
    { id: '3', isRead: true, type: 'info', joursRestants: 45, societeLocatrice: 'Publicité Plus', panneau_nom: 'Panneau Limete', face_orientation: 'EST', date_debut: '2026-08-23', date_fin: '2026-10-02' },
  ];

  // Transformation des données
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={refresh} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============================================
          HEADER : Réutilise CommercialHeader mais avec un wrapper PDG
          ============================================ */}
      <CommercialHeader
        user={user}
        onLogout={logout}
        onRefresh={refresh}
        onNotificationsToggle={() => setActiveTab(activeTab === 'notifications' ? 'dashboard' : 'notifications')}
        onAdminToggle={features?.canManageAgents ? () => setIsAdminModalOpen(true) : undefined}
        onCatalogueToggle={() => setActiveTab(activeTab === 'catalogue' ? 'dashboard' : 'catalogue')}
        onMapToggle={() => setActiveTab(activeTab === 'map' ? 'dashboard' : 'map')}
        onExportToggle={async () => {
          try {
            const { generateReportPDF } = await import('../commercial/services/reportPdfService');
            await generateReportPDF({
              panneaux: panneauxFiltres as any,
              stats: stats,
              filters: filters,
              user: user,
            });
          } catch (error) {
            console.error('❌ Erreur PDF:', error);
          }
        }}
        onReportsToggle={features?.canViewReports ? () => setIsReportsOpen(true) : undefined}
        onPredictionsToggle={features?.canViewPredictions ? () => setIsPredictionsOpen(true) : undefined}
        onTeamManagementToggle={features?.canManageTeam ? () => setIsTeamManagementOpen(true) : undefined}
        onReservationsManagementToggle={features?.canModifyReservations ? () => setIsReservationsManagementOpen(true) : undefined}
        notificationCount={notifications.filter(n => !n.isRead).length}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Onglets */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
            { id: 'catalogue', label: 'Panneaux', icon: null }, // emoji
            { id: 'map', label: 'Carte', icon: Map },
            { id: 'pending', label: 'Réservations', icon: Clock },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'strategie', label: 'Stratégie', icon: Target },
          ].map((tab: any) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            const unread = tab.id === 'notifications'
              ? notifications.filter((n) => !n.isRead).length
              : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-bold text-sm transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {Icon ? <Icon size={18} /> : <span>📸</span>}
                {tab.label}
                {unread > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs animate-pulse">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ============================================
            ONGLET ACCUEIL
            ============================================ */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
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
            ONGLET CATALOGUE / PANNEAUX
            ============================================ */}
        {activeTab === 'catalogue' && (
          <CatalogueContent user={user} />
        )}

        {/* ============================================
            ONGLET CARTE
            ============================================ */}
        {activeTab === 'map' && (
          <div className="h-[70vh] rounded-xl overflow-hidden border-2 border-gray-200">
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
            ONGLET RÉSERVATIONS
            ============================================ */}
        {activeTab === 'pending' && (
          <PendingReservationsTab user={user} />
        )}

        {/* ============================================
            ONGLET NOTIFICATIONS
            ============================================ */}
        {activeTab === 'notifications' && (
          <NotificationsTabContent
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
          />
        )}

        {/* ============================================
            ONGLET STRATÉGIE (spécifique PDG)
            ============================================ */}
        {activeTab === 'strategie' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-6 h-6 text-purple-600" />
                <h3 className="font-bold text-purple-700">Vision</h3>
              </div>
              <p className="text-sm text-gray-700">
                Devenir le leader du marché des panneaux publicitaires en Afrique centrale.
              </p>
            </div>

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

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 border border-amber-200">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-6 h-6 text-amber-600" />
                <h3 className="font-bold text-amber-700">Expansion</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>📍 Lubumbashi</li>
                <li>📍 Goma</li>
                <li>📍 Brazzaville</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-blue-700">Indicateurs</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Taux d'occupation: 85%</li>
                <li>• Satisfaction client: 95%</li>
                <li>• ROI: 30%</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* ============================================
          MODALS (réutilisés du commercial)
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
      <AdminModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
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