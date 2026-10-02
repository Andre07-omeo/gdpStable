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

// ✅ MODALES
import { ProfileModal } from './components/profile/ProfileModal';
import { ChangePasswordModal } from './components/profile/ChangePasswordModal';
import { InfoModal } from './components/profile/InfoModal';
import { StatsModal } from './components/profile/StatsModal';

// ✅ IMPORT DU FORMULAIRE SUPERVISEUR
import PanneauForm from '@/app/dashboard/superviseur/components/PanneauForm';

import type { DashboardStats, Panneau, Reservation } from './types';

// ============================================
// ✅ CONSTANTES DE HAUTEUR (pour compenser le header fixe)
// ============================================
// Doit correspondre à la hauteur réelle du <AdminHeader />
// Header : py-2 (mobile) / py-2.5 (sm) / py-3 (md) + contenu h-8/9/10
const HEADER_HEIGHT_MOBILE = 56;   // px — mobile (< sm)
const HEADER_HEIGHT_SM = 64;       // px — sm et +
const TABS_HEIGHT = 52;            // px — hauteur de la barre d'onglets

// ============================================
// ✅ TABS VALIDES
// ============================================
const VALID_TABS = [
  'dashboard',
  'statistiques',
  'panneaux',
  'reservations',
  'users',
  'superviseurs',
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
// CONTENU
// ============================================
function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeModule: TabId = isValidTab(tabParam) ? tabParam : DEFAULT_TAB;

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

  // ✅ State pour piloter le formulaire de modification panneau
  const [editingPanneau, setEditingPanneau] = useState<Panneau | null>(null);

  // ✅ Modales profil / settings
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

  const handlePanneauSaved = async () => {
    setEditingPanneau(null);
    await handleRefresh();
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

  const menuItems: { id: TabId; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Monitoring', icon: Activity },
    { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
    { id: 'panneaux', label: 'Panneaux', icon: MapPin },
    { id: 'reservations', label: 'Réservations', icon: Calendar },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <AdminSystemPage />;
      case 'statistiques':
        return <AdminDashboardStats stats={stats || undefined} loading={statsLoading} />;
      case 'admin-system':
        return <AdminSystemPage />;
      case 'panneaux':
        return (
          <AdminPanneauxList
            panneaux={panneaux}
            onRefresh={handleRefresh}
            onEdit={(p) => setEditingPanneau(p as unknown as Panneau)}
          />
        );
      case 'reservations':
        return <AdminReservationsList panneaux={panneaux} />;
      case 'users':
        return <UsersManagementPage />;
      case 'support':
        return <AdminSupport />;
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

        {/* ============================================ */}
        {/* ✅ HEADER FIXE */}
        {/* ============================================ */}
        <div className="fixed top-0 left-0 right-0 z-50">
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
        </div>

        {/* ============================================ */}
        {/* ✅ SPACER : compense la hauteur du header fixe */}
        {/* ============================================ */}
        <div
          className="w-full flex-shrink-0"
          style={{ height: `${HEADER_HEIGHT_MOBILE}px` }}
          aria-hidden="true"
        />

        {/* ============================================ */}
        {/* ✅ BARRE D'ONGLETS STICKY (sous le header fixe) */}
        {/* ============================================ */}
        <div
          className="fixed left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm w-full"
          style={{ top: `${HEADER_HEIGHT_MOBILE}px` }}
        >
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

        {/* ============================================ */}
        {/* ✅ SPACER : compense la hauteur des onglets */}
        {/* ============================================ */}
        <div
          className="w-full flex-shrink-0"
          style={{ height: `${TABS_HEIGHT}px` }}
          aria-hidden="true"
        />

        {/* ============================================ */}
        {/* CONTENU PRINCIPAL */}
        {/* ============================================ */}
        <main className="flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3 sm:py-4 md:py-6 pb-20 sm:pb-6">
          {renderContent()}
        </main>

        {/* ============================================ */}
        {/* MODALES PROFIL / SETTINGS */}
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

        {/* ✅ FORMULAIRE DE MODIFICATION PANNEAU */}
        <PanneauForm
          isOpen={!!editingPanneau}
          onClose={() => setEditingPanneau(null)}
          onSave={handlePanneauSaved}
          user={user}
          panneauToEdit={editingPanneau as any}
        />

      </div>

      {/* ✅ Styles globaux */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* ✅ Compense le header fixe lors d'un scroll vers un ancrage (#id) */
        html {
          scroll-padding-top: 120px;
        }
      `}</style>
    </LayoutWrapper>
  );
}

// ============================================
// EXPORT
// ============================================
export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <LayoutWrapper>
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
        </LayoutWrapper>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}