'use client';

// src/app/dashboard/admin/page.tsx
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, MapPin, Calendar, Users, BarChart3,
  HelpCircle, Loader2, Server, Shield, UserCog, Building2,
  Construction, ArrowLeft, Activity,
} from 'lucide-react';
import LayoutWrapper from '@/components/layout/LayoutWrapper';
import { AdminHeader } from './components/AdminHeader';
import { AdminDashboardStats } from './components/AdminDashboardStats';
import { AdminPanneauxList } from './components/AdminPanneauxList';
import { AdminReservationsList } from './components/AdminReservationsList';
import { AdminSupport } from './components/AdminSupport';
import UsersManagementPage from './users/page';

// ✅ MONITORING SYSTÈME (maintenant en page d'accueil)
import AdminSystemPage from './system/page';

// ✅ IMPORTS DES TYPES
import type { DashboardStats, Panneau, Reservation } from './types';

// ============================================
// PLACEHOLDER pour modules en construction
// ============================================
function ModulePlaceholder({
  title,
  description,
  icon,
  onBack,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
          {icon}
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold mb-3">
          <Construction size={12} />
          Module en construction
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          {title}
        </h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          {description}
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-blue-500/30 active:scale-95"
        >
          <ArrowLeft size={16} />
          Retour au tableau de bord
        </button>
      </div>
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // ✅ PAR DÉFAUT : monitoring (page d'accueil)
  const [activeModule, setActiveModule] = useState('dashboard');

  const [isLoading, setIsLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [panneaux, setPanneaux] = useState<Panneau[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // ✅ Vérification des droits d'accès
  useEffect(() => {
    if (user && user.profil !== 'SUPER_ADMIN' && user.profil !== 'ADMIN_SYSTEM') {
      router.push('/dashboard');
    }
    setIsLoading(false);
  }, [user, router]);

  // ✅ Chargement initial des données métier
  //    (le monitoring a son propre fetch dans AdminSystemPage)
  useEffect(() => {
    const loadAll = async () => {
      setStatsLoading(true);
      try {
        const [statsRes, panneauxRes, reservationsRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/panneaux'),
          fetch('/api/admin/reservations'),
        ]);

        if (statsRes.ok) {
          const statsData: DashboardStats = await statsRes.json();
          setStats(statsData);
        }
        if (panneauxRes.ok) {
          const panneauxData: Panneau[] = await panneauxRes.json();
          setPanneaux(panneauxData);
        }
        if (reservationsRes.ok) {
          const reservationsData: Reservation[] = await reservationsRes.json();
          setReservations(reservationsData);
        }
      } catch (error) {
        console.error('❌ Erreur chargement:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    loadAll();
  }, []);

  // ✅ Rafraîchissement manuel (données métier)
  const handleRefresh = async () => {
    try {
      const [statsRes, panneauxRes, reservationsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/panneaux'),
        fetch('/api/admin/reservations'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (panneauxRes.ok) setPanneaux(await panneauxRes.json());
      if (reservationsRes.ok) setReservations(await reservationsRes.json());
    } catch (error) {
      console.error('❌ Erreur refresh:', error);
    }
  };

  // ✅ Écran de chargement initial
  if (isLoading) {
    return (
      <LayoutWrapper>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
        </div>
      </LayoutWrapper>
    );
  }

  if (!user) return null;

  const isSuperAdmin = user.profil === 'SUPER_ADMIN';

  // ============================================
  // MENU NAVIGATION
  // ============================================
  const menuItems = [
    { id: 'dashboard', label: 'Monitoring', icon: Activity },      // 🎯 Page d'accueil = monitoring
    { id: 'statistiques', label: 'Statistiques', icon: BarChart3 }, // 📊 Stats métier
    { id: 'panneaux', label: 'Panneaux', icon: MapPin },
    { id: 'reservations', label: 'Réservations', icon: Calendar },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'faces', label: 'Faces', icon: Building2 },
    ...(isSuperAdmin
      ? [{ id: 'superviseurs', label: 'Superviseurs', icon: UserCog }]
      : []),
    ...(isSuperAdmin
      ? [{ id: 'profils', label: 'Profils', icon: Shield }]
      : []),
    { id: 'admin-system', label: 'Admin Système', icon: Server },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  // ============================================
  // RENDU DU CONTENU
  // ============================================
  const renderContent = () => {
    switch (activeModule) {
      // ============================================
      // 🎯 1. MONITORING SYSTÈME — PAGE D'ACCUEIL
      // ============================================
      case 'dashboard':
        return <AdminSystemPage />;

      // ============================================
      // 📊 2. STATISTIQUES — Métier (panneaux, CA, etc.)
      // ============================================
      case 'statistiques':
        return (
          <AdminDashboardStats
            stats={stats || undefined}
            loading={statsLoading}
          />
        );

      // ============================================
      // ⚙️ 3. ADMIN SYSTÈME — Redirige aussi vers monitoring
      // ============================================
      case 'admin-system':
        return <AdminSystemPage />;

      // ============================================
      // 🗺️ 4. GESTION DES PANNEAUX
      // ============================================
      case 'panneaux':
        return (
          <AdminPanneauxList
            panneaux={panneaux}
            onRefresh={handleRefresh}
          />
        );

      // ============================================
      // 📅 5. GESTION DES RÉSERVATIONS
      // ============================================
      case 'reservations':
        return <AdminReservationsList panneaux={panneaux} />;

      // ============================================
      // 👥 6. GESTION DES UTILISATEURS
      // ============================================
      case 'users':
        return <UsersManagementPage />;

      // ============================================
      // ❓ 7. SUPPORT
      // ============================================
      case 'support':
        return <AdminSupport />;

      // ============================================
      // 🚧 MODULES EN CONSTRUCTION
      // ============================================
      case 'faces':
        return (
          <ModulePlaceholder
            title="Gestion des Faces publicitaires"
            description="Ce module permettra de gérer toutes les faces publicitaires disponibles sur les panneaux : ajout, modification, suppression, et suivi de leur état."
            icon={<Building2 size={36} />}
            onBack={() => setActiveModule('dashboard')}
          />
        );

      case 'superviseurs':
        return (
          <ModulePlaceholder
            title="Gestion des Superviseurs"
            description="Ce module permettra de gérer les comptes superviseurs : création, attribution des zones géographiques, suivi des performances et gestion des permissions."
            icon={<UserCog size={36} />}
            onBack={() => setActiveModule('dashboard')}
          />
        );

      case 'profils':
        return (
          <ModulePlaceholder
            title="Gestion des Profils"
            description="Ce module permettra de configurer les profils utilisateurs, leurs rôles, permissions et accès aux différentes fonctionnalités du système."
            icon={<Shield size={36} />}
            onBack={() => setActiveModule('dashboard')}
          />
        );

      case 'localisation':
        return (
          <ModulePlaceholder
            title="Gestion de la Localisation"
            description="Ce module permettra de gérer la hiérarchie géographique : pays, provinces, villes, communes et districts."
            icon={<MapPin size={36} />}
            onBack={() => setActiveModule('dashboard')}
          />
        );

      // ============================================
      // FALLBACK → Monitoring
      // ============================================
      default:
        return <AdminSystemPage />;
    }
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen flex flex-col bg-gray-50 w-full">

        {/* ============================================
            HEADER ADMIN
            ============================================ */}
        <AdminHeader
          user={user}
          variant={isSuperAdmin ? 'super-admin' : 'admin'}
          onLogout={logout}
          onRefresh={handleRefresh}
          onNotificationsToggle={() => console.log('notifications')}
          notificationCount={notificationCount}
          // 🎯 Dashboard = Monitoring
          onDashboardToggle={() => setActiveModule('dashboard')}
          onPanneauxToggle={() => setActiveModule('panneaux')}
          onReservationsToggle={() => setActiveModule('reservations')}
          onUsersToggle={() => setActiveModule('users')}
          onStatsToggle={() => setActiveModule('statistiques')}
          onSupportToggle={() => setActiveModule('support')}
          onAdminSystemToggle={() => setActiveModule('admin-system')}
          onFacesToggle={() => setActiveModule('faces')}
          onSuperviseursToggle={
            isSuperAdmin ? () => setActiveModule('superviseurs') : undefined
          }
          onLocalisationToggle={() => setActiveModule('localisation')}
          onProfilsToggle={
            isSuperAdmin ? () => setActiveModule('profils') : undefined
          }
          onProfileClick={() => console.log('profil')}
          onChangePasswordClick={() => console.log('password')}
          onSettingsClick={() => console.log('settings')}
        />

        {/* ============================================
            BARRE DE NAVIGATION
            ============================================ */}
        <div className="bg-white border-b border-gray-200 shadow-sm w-full sticky top-[57px] sm:top-[65px] z-40">
          <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
            <div className="flex gap-1 sm:gap-2 overflow-x-auto py-2 -mx-3 sm:mx-0 px-3 sm:px-0 scrollbar-hide">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveModule(item.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================
            CONTENU PRINCIPAL
            ============================================ */}
        <main className="flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3 sm:py-4 md:py-6 pb-20 sm:pb-6">
          {renderContent()}
        </main>

      </div>

      {/* Scrollbar personnalisée */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </LayoutWrapper>
  );
}