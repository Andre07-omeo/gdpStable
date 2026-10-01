'use client';

// src/app/dashboard/superviseur/page.tsx
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import nextDynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import {
  MapPin, LayoutDashboard, Calendar, Users, BarChart3,
  TrendingUp, Activity, Eye, ChevronRight, AlertCircle,
  CheckCircle, Clock, Building, List, Grid, RefreshCw, Plus,
  ImageIcon
} from 'lucide-react';

import SupervisorHeader, { SupervisorView } from './components/SupervisorHeader';
import { useSupervisorData } from './hooks/useSupervisorData';
import GPSIndicator from './components/GPSIndicator';
import PanneauModal from './components/PanneauModal';
import ReservationDetailModal from './components/ReservationDetailModal';
import PanneauList from './components/PanneauList';
import PanneauForm from './components/PanneauForm';
import LocalisationManager from './components/LocalisationManager';
// ✨ AJOUT : import du composant AffichagesManager
import AffichagesManager from './components/AffichagesManager';

const MapComponent = nextDynamic(() => import('./components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950">
      <div className="text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/80 text-base sm:text-lg font-bold uppercase tracking-wider">
          Chargement de la carte...
        </p>
      </div>
    </div>
  ),
});

export default function SupervisorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [isPanneauModalOpen, setIsPanneauModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<SupervisorView>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [panneauToEdit, setPanneauToEdit] = useState<any>(null); // ✅ NOUVEAU

  const hasRedirected = useRef(false);

  const {
    panneaux,
    loading,
    error,
    selectedPanneau,
    setSelectedPanneau,
    selectedReservation,
    setSelectedReservation,
    userLocation,
    locationError,
    loadPanneaux,
    refreshPanneaux,
    isRefreshing,
  } = useSupervisorData();

  useEffect(() => {
    if (authLoading) return;
    if (hasRedirected.current) return;
    if (!user) {
      hasRedirected.current = true;
      console.log('🔒 Redirection vers /login');
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // ✅ Restauration de la vue active
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('superviseur_active_view') as SupervisorView | null;
      if (savedView) setActiveView(savedView);
    }
  }, []);

  const handleViewChange = (view: SupervisorView) => {
    setActiveView(view);
    if (typeof window !== 'undefined') {
      localStorage.setItem('superviseur_active_view', view);
    }
  };

  const handleMarkerClick = (panneau: any) => {
    setSelectedPanneau(panneau);
    setIsPanneauModalOpen(true);
  };

  const handleSelectReservation = (reservation: any) => {
    setSelectedReservation(reservation);
    setIsReservationModalOpen(true);
  };

  const handleUpdate = async () => {
    await loadPanneaux();
  };

  const handlePanneauProblem = async (panneauId: number, raison: string) => {
    try {
      const res = await fetch('/api/superviseurs/panneau-probleme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panneauId, raison, type: 'panneau' }),
      });
      if (res.ok) {
        await loadPanneaux();
        alert('✅ Panneau marqué comme en panne');
      } else {
        const error = await res.json();
        alert('❌ Erreur: ' + (error.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la déclaration');
    }
  };

  const handleFaceProblem = async (panneauId: number, faceId: number, raison: string) => {
    try {
      const res = await fetch('/api/superviseurs/panneau-probleme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panneauId, faceId, raison, type: 'face' }),
      });
      if (res.ok) {
        await loadPanneaux();
        alert('✅ Face marquée comme en panne');
      } else {
        const error = await res.json();
        alert('❌ Erreur: ' + (error.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la déclaration');
    }
  };

  const handleResoudreProblem = async (panneauId: number, faceId?: number) => {
    try {
      const res = await fetch('/api/superviseurs/panneau-probleme', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panneauId, faceId }),
      });
      if (res.ok) {
        await loadPanneaux();
        alert('✅ Problème résolu');
      } else {
        const error = await res.json();
        alert('❌ Erreur: ' + (error.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la résolution');
    }
  };

  // ✅ NOUVEAU : Ouvrir le formulaire en mode édition
  const handleEditPanneau = async (panneau: any) => {
    try {
      const res = await fetch(`/api/panneaux/${panneau.id_panneau}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPanneauToEdit(json.data);
        setIsFormOpen(true);
      } else {
        setPanneauToEdit(panneau);
        setIsFormOpen(true);
      }
    } catch (e) {
      console.error('❌ Erreur chargement panneau:', e);
      setPanneauToEdit(panneau);
      setIsFormOpen(true);
    }
  };

  // ✅ NOUVEAU : Supprimer un panneau
  const handleDeletePanneau = async (panneauId: number) => {
    try {
      const res = await fetch(`/api/panneaux/${panneauId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert('✅ Panneau supprimé avec succès');
        await loadPanneaux();
      } else {
        alert('❌ Erreur: ' + (json.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  // ✅ NOUVEAU : Fermer et reset le formulaire
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setPanneauToEdit(null);
  };

  // ✅ NOUVEAU : Ouvrir en mode création
  const handleOpenCreateForm = () => {
    setPanneauToEdit(null);
    setIsFormOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950">
        <div className="text-center px-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80 text-base sm:text-lg font-bold uppercase tracking-wider">
            Authentification...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950">
        <div className="text-center px-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80 text-base sm:text-lg font-bold uppercase tracking-wider">
            Redirection vers la connexion...
          </p>
        </div>
      </div>
    );
  }

  if (loading && !isRefreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950">
        <div className="text-center px-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80 text-base sm:text-lg font-bold uppercase tracking-wider">
            Chargement des panneaux...
          </p>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center border border-red-100">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={40} className="text-red-500 sm:w-12 sm:h-12" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
            Erreur de chargement
          </h3>
          <p className="text-gray-600 text-sm mb-6">
            {error || 'Impossible de charger les panneaux.'}
          </p>
          <div className="space-y-3">
            <button
              onClick={refreshPanneaux}
              disabled={isRefreshing}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Actualisation...' : '🔄 Réessayer'}
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                }
                router.replace('/login');
              }}
              className="w-full px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  const panneauxData = Array.isArray(panneaux) ? panneaux : [];

  const totalPanneaux = panneauxData.length || 0;
  const totalFaces = panneauxData.reduce((acc, p) => acc + (p.faces?.length || 0), 0) || 0;
  const panneauxActifs = panneauxData.filter((p) => p.etat === 'Actif').length || 0;
  const tauxOccupation =
    totalPanneaux > 0 && totalPanneaux * 4 > 0
      ? Math.round((totalFaces / (totalPanneaux * 4)) * 100)
      : 0;
  const panneauxAvecProblemes =
    panneauxData.filter((p) => p.etat === 'En panne' || p.etat === 'Inactif').length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <SupervisorHeader
        user={user}
        activeView={activeView}
        onViewChange={handleViewChange}
        panneaux={panneauxData}
      />

      {/* ✅ Container responsive : padding + largeur max pour 4K */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-16 py-4 sm:py-6 lg:py-8 w-full max-w-[1920px] 2xl:max-w-[2200px] mx-auto">
        {activeView === 'dashboard' && (
          <div className="space-y-5 sm:space-y-6 lg:space-y-8 animate-fadeIn">
            {/* ============ STATS ============ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-4 sm:p-5 lg:p-6 hover:shadow-xl transition">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 font-bold uppercase truncate">
                      Panneaux
                    </p>
                    <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-blue-800">
                      {totalPanneaux}
                    </p>
                    <p className="text-[10px] sm:text-xs text-emerald-600 truncate">
                      {panneauxActifs} actifs
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-blue-600 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-4 sm:p-5 lg:p-6 hover:shadow-xl transition">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 font-bold uppercase truncate">
                      Faces
                    </p>
                    <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-blue-800">
                      {totalFaces}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-400 truncate">
                      {totalPanneaux} panneau(x)
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <LayoutDashboard size={18} className="text-emerald-600 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-4 sm:p-5 lg:p-6 hover:shadow-xl transition">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 font-bold uppercase truncate">
                      Occupation
                    </p>
                    <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-purple-600">
                      {tauxOccupation}%
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-400 truncate">Global</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0">
                    <TrendingUp size={18} className="text-purple-600 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-4 sm:p-5 lg:p-6 hover:shadow-xl transition">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 font-bold uppercase truncate">
                      Problèmes
                    </p>
                    <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-red-600">
                      {panneauxAvecProblemes}
                    </p>
                    <p className="text-[10px] sm:text-xs text-red-500 truncate">À résoudre</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                    <AlertCircle size={18} className="text-red-600 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* ============ ACTIONS RAPIDES ============ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
              <div
                onClick={() => handleViewChange('panneaux')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg p-3 sm:p-4 lg:p-6 text-white hover:shadow-xl transition cursor-pointer group"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                    <Building size={18} className="text-amber-400 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm lg:text-lg truncate">Panneaux</p>
                    <p className="text-[10px] sm:text-xs lg:text-sm text-blue-200 truncate">
                      Voir et déclarer
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => handleViewChange('localisation')}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl shadow-lg p-3 sm:p-4 lg:p-6 text-white hover:shadow-xl transition cursor-pointer group"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                    <List size={18} className="text-white sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm lg:text-lg truncate">Enregistrement</p>
                    <p className="text-[10px] sm:text-xs lg:text-sm text-emerald-200 truncate">
                      Pays, provinces...
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => handleViewChange('affichages')}
                className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl shadow-lg p-3 sm:p-4 lg:p-6 text-white hover:shadow-xl transition cursor-pointer group"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                    <ImageIcon size={18} className="text-white sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm lg:text-lg truncate">Affichages</p>
                    <p className="text-[10px] sm:text-xs lg:text-sm text-purple-200 truncate">
                      Campagnes validées
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl shadow-lg p-3 sm:p-4 lg:p-6 text-white hover:shadow-xl transition cursor-pointer group">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                    <Eye size={18} className="text-white sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm lg:text-lg truncate">Valider</p>
                    <p className="text-[10px] sm:text-xs lg:text-sm text-amber-200 truncate">
                      Vérifier
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-slate-600 to-slate-700 rounded-2xl shadow-lg p-3 sm:p-4 lg:p-6 text-white hover:shadow-xl transition cursor-pointer group col-span-2 sm:col-span-1">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                    <BarChart3 size={18} className="text-white sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm lg:text-lg truncate">Rapports</p>
                    <p className="text-[10px] sm:text-xs lg:text-sm text-slate-200 truncate">
                      Générer
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ ENREGISTREMENT ============ */}
        {activeView === 'localisation' && <LocalisationManager />}

        {/* ============ AFFICHAGES ============ */}
        {activeView === 'affichages' && <AffichagesManager user={user} />}

        {/* ============ PANNEAUX ============ */}
        {activeView === 'panneaux' && (
          <div className="animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 truncate">
                  📋 Gestion des panneaux
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {totalPanneaux} panneau(x) • {panneauxAvecProblemes} problème(s)
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={refreshPanneaux}
                  disabled={isRefreshing}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">{isRefreshing ? '...' : 'Actualiser'}</span>
                  <span className="sm:hidden">Refresh</span>
                </button>
                <button
                  onClick={handleOpenCreateForm}
                  className="flex-1 sm:flex-none px-3 sm:px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2 group text-sm"
                >
                  <Plus
                    size={16}
                    className="group-hover:rotate-90 transition-transform duration-300"
                  />
                  <span className="hidden sm:inline">Nouveau panneau</span>
                  <span className="sm:hidden">Nouveau</span>
                </button>
              </div>
            </div>

            {panneauxData && panneauxData.length > 0 ? (
              <PanneauList
                panneaux={panneauxData}
                onPanneauProblem={handlePanneauProblem}
                onFaceProblem={handleFaceProblem}
                onResoudreProblem={handleResoudreProblem}
                onEditPanneau={handleEditPanneau}
                onDeletePanneau={handleDeletePanneau}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 sm:p-8 lg:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <MapPin size={32} className="text-blue-300 sm:w-9 sm:h-9 lg:w-11 lg:h-11" />
                </div>
                <p className="font-bold text-gray-700 text-sm sm:text-base lg:text-lg">
                  Aucun panneau disponible
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mb-6">
                  Créez votre premier panneau en cliquant sur "Nouveau panneau"
                </p>
                <button
                  onClick={handleOpenCreateForm}
                  className="px-5 sm:px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2 mx-auto text-sm"
                >
                  <Plus size={18} />
                  Ajouter un panneau
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============ MAP ============ */}
        {activeView === 'map' && (
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden h-[60vh] sm:h-[70vh] lg:h-[75vh] min-h-[350px] sm:min-h-[450px] lg:min-h-[550px] relative">
            <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-[1000]">
              <GPSIndicator userLocation={userLocation} locationError={locationError} />
            </div>
            <div className="w-full h-full">
              <MapComponent
                panneaux={panneauxData}
                userLocation={userLocation}
                onMarkerClick={handleMarkerClick}
              />
            </div>
          </div>
        )}
      </div>

      {/* ============ MODALS ============ */}
      <AnimatePresence>
        {isPanneauModalOpen && selectedPanneau && (
          <PanneauModal
            isOpen={isPanneauModalOpen}
            panneau={selectedPanneau}
            user={user}
            onClose={() => {
              setIsPanneauModalOpen(false);
              setSelectedPanneau(null);
            }}
            onSelectReservation={handleSelectReservation}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFormOpen && (
          <PanneauForm
            isOpen={isFormOpen}
            onClose={handleCloseForm}
            onSave={(data) => {
              console.log('✅ Panneau enregistré:', data);
              loadPanneaux();
              handleCloseForm();
            }}
            user={user}
            panneauToEdit={panneauToEdit}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReservationModalOpen && selectedReservation && (
          <ReservationDetailModal
            isOpen={isReservationModalOpen}
            reservation={selectedReservation}
            onClose={() => {
              setIsReservationModalOpen(false);
              setSelectedReservation(null);
            }}
            onUpdate={handleUpdate}
            user={user}
          />
        )}
      </AnimatePresence>
    </div>
  );
}