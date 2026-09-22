// src/app/dashboard/superviseur/page.tsx

'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import nextDynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import {
  MapPin, LayoutDashboard, Calendar, Users, BarChart3,
  TrendingUp, Activity, Eye, ChevronRight, AlertCircle,
  CheckCircle, Clock, Building, List, Grid, RefreshCw, Plus
} from 'lucide-react';

import SupervisorHeader from './components/SupervisorHeader';
import { useSupervisorData } from './hooks/useSupervisorData';
import GPSIndicator from './components/GPSIndicator';
import PanneauModal from './components/PanneauModal';
import ReservationDetailModal from './components/ReservationDetailModal';
import PanneauList from './components/PanneauList';
import PanneauForm from './components/PanneauForm';

const MapComponent = nextDynamic(() => import('./components/MapComponent'), {
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

export default function SupervisorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [isPanneauModalOpen, setIsPanneauModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'map' | 'panneaux'>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // ✅ Garde-fou anti-boucle : on ne redirige qu'UNE seule fois
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

  // ✅ Redirection déléguée à AuthContext — on suit uniquement son état
  useEffect(() => {
    if (authLoading) return;              // AuthContext charge encore → on attend
    if (hasRedirected.current) return;    // déjà redirigé → on ne refait pas
    if (!user) {                          // AuthContext a fini ET pas de user
      hasRedirected.current = true;
      console.log('🔒 Redirection vers /login (authLoading=false, user=null)');
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // ✅ Restauration de la vue active
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('superviseur_active_view') as
        | 'dashboard'
        | 'map'
        | 'panneaux'
        | null;
      if (savedView) setActiveView(savedView);
    }
  }, []);

  const handleViewChange = (view: 'dashboard' | 'map' | 'panneaux') => {
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

  const handleFaceProblem = async (
    panneauId: number,
    faceId: number,
    raison: string
  ) => {
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

  // ✅ 1. AuthContext charge encore
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80 text-lg font-bold uppercase tracking-wider">
            Authentification...
          </p>
        </div>
      </div>
    );
  }

  // ✅ 2. AuthContext a fini ET pas de user → redirection en cours
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80 text-lg font-bold uppercase tracking-wider">
            Redirection vers la connexion...
          </p>
        </div>
      </div>
    );
  }

  // ✅ 3. User présent → on continue
  if (loading && !isRefreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80 text-lg font-bold uppercase tracking-wider">
            Chargement des panneaux...
          </p>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-red-100">
          <div className="w-24 h-24 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={48} className="text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Erreur de chargement</h3>
          <p className="text-gray-600 text-sm mb-6">
            {error || 'Impossible de charger les panneaux. Veuillez réessayer.'}
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
  const totalFaces =
    panneauxData.reduce((acc, p) => acc + (p.faces?.length || 0), 0) || 0;
  const panneauxActifs =
    panneauxData.filter((p) => p.etat === 'Actif').length || 0;
  const tauxOccupation =
    totalPanneaux > 0 && totalPanneaux * 4 > 0
      ? Math.round((totalFaces / (totalPanneaux * 4)) * 100)
      : 0;
  const panneauxAvecProblemes =
    panneauxData.filter((p) => p.etat === 'En panne' || p.etat === 'Inactif')
      .length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <SupervisorHeader
        user={user}
        activeView={activeView}
        onViewChange={handleViewChange}
        panneaux={panneauxData}
      />

      <div className="p-4 sm:p-6">
        {activeView === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 hover:shadow-xl transition transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-bold uppercase">
                      Panneaux
                    </p>
                    <p className="text-3xl font-bold text-blue-800">
                      {totalPanneaux}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {panneauxActifs} actifs
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <MapPin size={24} className="text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 hover:shadow-xl transition transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-bold uppercase">
                      Faces
                    </p>
                    <p className="text-3xl font-bold text-blue-800">
                      {totalFaces}
                    </p>
                    <p className="text-xs text-gray-400">
                      {totalPanneaux} panneau(x)
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                    <LayoutDashboard size={24} className="text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 hover:shadow-xl transition transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-bold uppercase">
                      Taux occupation
                    </p>
                    <p className="text-3xl font-bold text-purple-600">
                      {tauxOccupation}%
                    </p>
                    <p className="text-xs text-gray-400">Global</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                    <TrendingUp size={24} className="text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 hover:shadow-xl transition transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-bold uppercase">
                      Problèmes
                    </p>
                    <p className="text-3xl font-bold text-red-600">
                      {panneauxAvecProblemes}
                    </p>
                    <p className="text-xs text-red-500">À résoudre</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                    <AlertCircle size={24} className="text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div
                onClick={() => handleViewChange('panneaux')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
                    <Building size={28} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Gestion panneaux</p>
                    <p className="text-sm text-blue-200">Voir et déclarer</p>
                  </div>
                  <ChevronRight
                    size={20}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition"
                  />
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
                    <Eye size={28} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Valider</p>
                    <p className="text-sm text-amber-200">Vérifier et approuver</p>
                  </div>
                  <ChevronRight
                    size={20}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition"
                  />
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
                    <Calendar size={28} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Réservations</p>
                    <p className="text-sm text-emerald-200">Voir toutes</p>
                  </div>
                  <ChevronRight
                    size={20}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition"
                  />
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
                    <BarChart3 size={28} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Rapports</p>
                    <p className="text-sm text-purple-200">Générer un rapport</p>
                  </div>
                  <ChevronRight
                    size={20}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'panneaux' && (
          <div className="animate-fadeIn">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  📋 Gestion des panneaux
                </h2>
                <p className="text-sm text-gray-500">
                  {totalPanneaux} panneau(x) • {panneauxAvecProblemes} problème(s)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={refreshPanneaux}
                  disabled={isRefreshing}
                  className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw
                    size={18}
                    className={isRefreshing ? 'animate-spin' : ''}
                  />
                  {isRefreshing ? '...' : 'Actualiser'}
                </button>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black rounded-xl font-bold hover:shadow-lg hover:shadow-amber-500/30 transition flex items-center gap-2 group"
                >
                  <Plus
                    size={18}
                    className="group-hover:rotate-90 transition-transform duration-300"
                  />
                  Nouveau panneau
                </button>
              </div>
            </div>

            {panneauxData && panneauxData.length > 0 ? (
              <PanneauList
                panneaux={panneauxData}
                onPanneauProblem={handlePanneauProblem}
                onFaceProblem={handleFaceProblem}
                onResoudreProblem={handleResoudreProblem}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-12 text-center">
                <div className="w-24 h-24 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <MapPin size={40} className="text-blue-300" />
                </div>
                <p className="font-bold text-gray-700 text-lg">
                  Aucun panneau disponible
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Créez votre premier panneau en cliquant sur "Nouveau panneau"
                </p>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
                >
                  <Plus size={18} />
                  Ajouter un panneau
                </button>
              </div>
            )}
          </div>
        )}

        {activeView === 'map' && (
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden h-[75vh] min-h-[500px] relative">
            <div className="absolute top-4 left-4 z-[1000]">
              <GPSIndicator
                userLocation={userLocation}
                locationError={locationError}
              />
            </div>

            <div className="w-full h-full">
              <MapComponent
                panneaux={panneauxData}
                userLocation={userLocation}
                onMarkerClick={handleMarkerClick}
              />
            </div>

            {/* La légende est désormais gérée dans MapComponent.tsx (SupervisorLegend) */}
          </div>
        )}
      </div>

      {/* Modals */}
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
            onClose={() => setIsFormOpen(false)}
            onSave={(data) => {
              console.log('✅ Panneau enregistré:', data);
              loadPanneaux();
            }}
            user={user}
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