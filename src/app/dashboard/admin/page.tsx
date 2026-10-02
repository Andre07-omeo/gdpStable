'use client';

// src/app/dashboard/admin/page.tsx
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  MapPin, Calendar, Users, BarChart3,
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
import AdminSystemPage from './system/page';

// ✅ IMPORTS DES MODALES
import { ProfileModal } from './components/profile/ProfileModal';
import { ChangePasswordModal } from './components/profile/ChangePasswordModal';
import { InfoModal } from './components/profile/InfoModal';
import { StatsModal } from './components/profile/StatsModal';

import type { DashboardStats, Panneau, Reservation } from './types';
// ============================================
// ✅ TABS VALIDES (source unique de vérité)
// ============================================
const VALID_TABS = [
  'dashboard',       // Monitoring
  'statistiques',
  'panneaux',
  'reservations',
  'users',
  'faces',
  'superviseurs',
  // 'profils',
  'localisation',
  'admin-system',
  'support',
] as const;

type TabId = typeof VALID_TABS[number];

const DEFAULT_TAB: TabId = 'dashboard';

function isValidTab(value: string | null): value is TabId {
  return !!value && (VALID_TABS as readonly string[]).includes(value);
}

// ============================================
// PLACEHOLDER
// ============================================
function ModulePlaceholder({
  title, description, icon, onBack,
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{description}</p>
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
// CONTENU (isolé car useSearchParams exige Suspense)
// ============================================
function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ✅ Onglet actif = source unique : URL
  const tabParam = searchParams.get('tab');
  const activeModule: TabId = isValidTab(tabParam) ? tabParam : DEFAULT_TAB;

  // ✅ Setter d'onglet → met à jour l'URL (avec replace pour ne pas polluer l'historique)
  const setActiveModule = useCallback((tab: string) => {
    if (!isValidTab(tab)) return;
    const params = new URLSearchParams(searchParams.toString());
    if (tab === DEFAULT_TAB) {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.replace(url, { scroll: false });
  }, [pathname, router, searchParams]);

  const [isLoading, setIsLoading] = useState(true);
  const [notificationCount] = useState(0);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [panneaux, setPanneaux] = useState<Panneau[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // ✅ Modales (brancher ici tes vrais composants)
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // ✅ Vérif droits
  useEffect(() => {
    if (user && user.profil !== 'SUPER_ADMIN' && user.profil !== 'ADMIN_SYSTEM') {
      router.push('/dashboard');
    }
    setIsLoading(false);
  }, [user, router]);

  // ✅ Chargement données
  useEffect(() => {
    const loadAll = async () => {
      setStatsLoading(true);
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
        console.error('❌ Erreur chargement:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    loadAll();
  }, []);

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

  // ✅ Menu unifié (mêmes IDs que VALID_TABS)
  const menuItems: { id: TabId; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Monitoring', icon: Activity },
    { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
    { id: 'panneaux', label: 'Panneaux', icon: MapPin },
    { id: 'reservations', label: 'Réservations', icon: Calendar },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'faces', label: 'Faces', icon: Building2 },
    ...(isSuperAdmin ? [{ id: 'superviseurs' as TabId, label: 'Superviseurs', icon: UserCog }] : []),
    ...(isSuperAdmin ? [{ id: 'profils' as TabId, label: 'Profils', icon: Shield }] : []),
    { id: 'localisation', label: 'Localisation', icon: MapPin },
    { id: 'admin-system', label: 'Admin Système', icon: Server },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  // ✅ Rendu selon onglet actif
  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <AdminSystemPage />;
      case 'statistiques':
        return <AdminDashboardStats stats={stats || undefined} loading={statsLoading} />;
      case 'admin-system':
        return <AdminSystemPage />;
      case 'panneaux':
        return <AdminPanneauxList panneaux={panneaux} onRefresh={handleRefresh} />;
      case 'reservations':
        return <AdminReservationsList panneaux={panneaux} />;
      case 'users':
        return <UsersManagementPage />;
      case 'support':
        return <AdminSupport />;
      case 'faces':
        return (
          <ModulePlaceholder
            title="Gestion des Faces publicitaires"
            description="Ce module permettra de gérer toutes les faces publicitaires disponibles sur les panneaux."
            icon={<Building2 size={36} />}
            onBack={() => setActiveModule('dashboard')}
          />
        );
      case 'superviseurs':
        return (
          <ModulePlaceholder
            title="Gestion des Superviseurs"
            description="Ce module permettra de gérer les comptes superviseurs."
            icon={<UserCog size={36} />}
            onBack={() => setActiveModule('dashboard')}
          />
        );

      case 'localisation':
        return (
          <ModulePlaceholder
            title="Gestion de la Localisation"
            description="Ce module permettra de gérer la hiérarchie géographique."
            icon={<MapPin size={36} />}
            onBack={() => setActiveModule('dashboard')}
          />
        );
      default:
        return <AdminSystemPage />;
    }
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen flex flex-col bg-gray-50 w-full">

        {/* HEADER */}
        <AdminHeader
          user={user}
          variant={isSuperAdmin ? 'super-admin' : 'admin'}
          onLogout={logout}
          onRefresh={handleRefresh}
          onNotificationsToggle={() => setIsNotificationsOpen((v) => !v)}
          notificationCount={notificationCount}
          onDashboardToggle={() => setActiveModule('dashboard')}
          onPanneauxToggle={() => setActiveModule('panneaux')}
          onReservationsToggle={() => setActiveModule('reservations')}
          onUsersToggle={() => setActiveModule('users')}
          onStatsToggle={() => setActiveModule('statistiques')}
          onSupportToggle={() => setActiveModule('support')}
          onAdminSystemToggle={() => setActiveModule('admin-system')}
          onFacesToggle={() => setActiveModule('faces')}
          onSuperviseursToggle={isSuperAdmin ? () => setActiveModule('superviseurs') : undefined}
          onLocalisationToggle={() => setActiveModule('localisation')}
          onProfilsToggle={isSuperAdmin ? () => setActiveModule('profils') : undefined}
          onProfileClick={() => setIsProfileOpen(true)}
          onChangePasswordClick={() => setIsChangePasswordOpen(true)}
          onSettingsClick={() => setIsSettingsOpen(true)}
          onNotificationsClick={() => setIsNotificationsOpen(true)}
          onHelpClick={() => setIsHelpOpen(true)}
        />

        {/* BARRE D'ONGLETS */}
        <div className="bg-white border-b border-gray-200 shadow-sm w-full sticky top-[57px] sm:top-[65px] z-40">
          <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
            <div
              className="flex gap-1 sm:gap-2 overflow-x-auto py-2 -mx-3 sm:mx-0 px-3 sm:px-0 scrollbar-hide"
              role="tablist"
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveModule(item.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap flex-shrink-0 ${isActive
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

        {/* CONTENU */}
        <main className="flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3 sm:py-4 md:py-6 pb-20 sm:pb-6">
          {renderContent()}
        </main>

        {/* ============================================ */}
        {/* MODALES — brancher tes vrais composants ici */}
        {/* ============================================ */}

        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
        />
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          userEmail={user.email}
          userName={`${user.prenom || ''} ${user.nom || ''}`.trim()}
        />
        <InfoModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          title="Paramètres"
        />
        <InfoModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          title="Aide & Support"
        />
        <StatsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />

      </div>

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

// ============================================
// EXPORT (avec Suspense car useSearchParams)
// ============================================
export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <LayoutWrapper>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      </LayoutWrapper>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}