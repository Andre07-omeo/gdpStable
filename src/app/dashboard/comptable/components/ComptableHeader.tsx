// src/app/dashboard/comptable/components/ComptableHeader.tsx

'use client';

export const dynamic = 'force-dynamic';

import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bell, RefreshCw, LayoutDashboard, FileText, BarChart3, Crown,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogoutConfirmModal } from '@/app/dashboard/commercial/components/LogoutConfirmModal';
import { ProfileDropdown, DropdownExtraAction } from '@/app/dashboard/commercial/components/ProfileDropdown';

interface ComptableHeaderProps {
  user: any;
  onLogout: () => void;
  onRefresh: () => void;
  onNotificationsToggle: () => void;
  onProfileClick?: () => void;
  onChangePasswordClick?: () => void;
  onSettingsClick?: () => void;
  notificationCount: number;
}

const THEME = {
  headerBg: 'bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800',
  border: 'border-blue-600/50',
  accent: 'text-amber-400',
  subtitle: 'text-blue-300',
  dotBorder: 'border-blue-800',
  divider: 'bg-blue-600/50',
  profileEmail: 'text-blue-200',
  title: 'Comptabilité',
  shortTitle: 'Compta',
  iconBadge: 'bg-amber-500/20 border-amber-500/30 shadow-amber-500/10',
};

// ✅ ROUTES RÉELLES (pas de query string)
const NAV_TABS = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    shortLabel: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard/comptable',           // 👈 route dédiée
  },
  {
    id: 'factures',
    label: 'Factures',
    shortLabel: 'Factures',
    icon: FileText,
    href: '/dashboard/comptable/factures',  // 👈 route dédiée
  },
  {
    id: 'stats',
    label: 'Statistiques',
    shortLabel: 'Stats',
    icon: BarChart3,
    href: '/dashboard/comptable/stats',     // 👈 route dédiée
  },
];

export function ComptableHeader({
  user, onLogout, onRefresh, onNotificationsToggle,
  onProfileClick, onChangePasswordClick, onSettingsClick, notificationCount,
}: ComptableHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { getUserName, getUserEmail } = useAuth();

  useEffect(() => setMounted(true), []);

  const displayName = mounted ? getUserName() : '';
  const displayEmail = mounted ? getUserEmail() : '';

  // ✅ Détection du tab actif par le pathname réel
  const currentTab = useMemo(() => {
    if (pathname === '/dashboard/comptable/stats' || pathname.startsWith('/dashboard/comptable/stats/')) return 'stats';
    if (pathname.startsWith('/dashboard/comptable/factures')) return 'factures';
    if (pathname === '/dashboard/comptable') return 'dashboard';
    return 'dashboard';
  }, [pathname]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await onRefresh(); }
    finally { setTimeout(() => setIsRefreshing(false), 800); }
  };

  const handleLogoutClick = () => setIsLogoutModalOpen(true);

  const extraActions: DropdownExtraAction[] = useMemo(
    () => [
      {
        id: 'notifications',
        label: 'Notifications',
        icon: <Bell size={16} />,
        onClick: () => onNotificationsToggle?.(),
        badge: notificationCount,
        hidden: !onNotificationsToggle,
      },
      {
        id: 'refresh',
        label: 'Actualiser',
        icon: <RefreshCw size={16} />,
        onClick: handleRefresh,
      },
    ],
    [onNotificationsToggle, notificationCount]
  );

  return (
    <>
      <header className={`${THEME.headerBg} shadow-2xl sticky top-0 z-50 border-b ${THEME.border}`}>
        <div className="px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">

            {/* LOGO + TITRE */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => router.push('/dashboard/comptable')}
                className="relative group transition-all duration-500 hover:scale-110 active:scale-95"
                title="Accueil"
              >
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${THEME.iconBadge} flex items-center justify-center border shadow-lg overflow-hidden`}>
                  <Image src="/icons/icon-32x32.png" alt="Logo" width={32} height={32} className="object-contain" priority />
                </div>
                <div className={`absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 ${THEME.dotBorder} animate-pulse`} />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-md">
                  <Crown className="w-3 h-3 text-blue-950" />
                </div>
              </button>

              <div className="hidden xl:block">
                <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span className={THEME.accent}>GDP</span>
                  <span className="text-white/60">|</span>
                  <span className="text-white">{THEME.title}</span>
                </h1>
                <p className={`text-[9px] ${THEME.subtitle} uppercase tracking-[0.15em] font-bold`}>
                  {user?.profilLibelle || 'Gestion financière'}
                </p>
              </div>

              <div className="xl:hidden">
                <h1 className="text-base font-bold text-white flex items-center gap-1">
                  <span className={THEME.accent}>GDP</span>
                  <span className="text-white/60">|</span>
                  <span className="text-white">{THEME.shortTitle}</span>
                </h1>
              </div>
            </div>

            {/* ONGLETS DESKTOP */}
            <nav className="hidden md:flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10 backdrop-blur-sm">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => router.push(tab.href)}
                    className={`
                      relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg
                      text-xs lg:text-sm font-bold transition-all duration-300 whitespace-nowrap
                      ${isActive
                        ? 'bg-white text-blue-700 shadow-md'
                        : 'text-white/80 hover:text-white hover:bg-white/10'}
                    `}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="hidden lg:inline">{tab.label}</span>
                    <span className="lg:hidden">{tab.shortLabel}</span>
                  </button>
                );
              })}
            </nav>

            <div className="flex-1 md:hidden" />

            {/* PROFIL DESKTOP */}
            {mounted && displayName && (
              <div className="hidden xl:flex items-center gap-2 flex-shrink-0 mr-2">
                <div className="text-right max-w-[200px]">
                  <p className="text-sm font-semibold text-white truncate leading-tight">{displayName}</p>
                  <p className={`text-[10px] ${THEME.profileEmail} truncate italic leading-tight`}>{displayEmail}</p>
                </div>
              </div>
            )}

            <div className={`hidden xl:block w-px h-8 ${THEME.divider} mx-1`} />

            {/* ICÔNES */}
            <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              {onNotificationsToggle && (
                <button onClick={onNotificationsToggle}
                  className="group relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all duration-300 hover:scale-110 active:scale-95"
                  title="Notifications">
                  <Bell className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </button>
              )}
              <button onClick={handleRefresh}
                className="group relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all duration-300 hover:scale-110 active:scale-95"
                title="Actualiser">
                <RefreshCw className={`w-4 h-4 transition-transform duration-300 group-hover:rotate-180 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className={`hidden sm:block w-px h-8 ${THEME.divider} mx-1`} />

            {/* AVATAR */}
            {mounted && displayName && (
              <div className="flex-shrink-0">
                <ProfileDropdown
                  userName={displayName}
                  userEmail={displayEmail}
                  userProfil={user?.profil || 'COMPTABLE'}
                  onLogout={handleLogoutClick}
                  onProfileClick={onProfileClick}
                  onChangePasswordClick={onChangePasswordClick}
                  onSettingsClick={onSettingsClick}
                  onHelpClick={() => console.log('Aide')}
                  extraActions={extraActions}
                />
              </div>
            )}
          </div>

          {/* ONGLETS MOBILE */}
          <nav className="md:hidden flex items-center gap-1 mt-2 bg-white/5 rounded-xl p-1 border border-white/10 overflow-x-auto">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button key={tab.id} onClick={() => router.push(tab.href)}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg
                    text-[11px] font-bold transition-all duration-300 whitespace-nowrap
                    ${isActive ? 'bg-white text-blue-700 shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'}
                  `}>
                  <Icon size={14} className="flex-shrink-0" />
                  <span>{tab.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => { setIsLogoutModalOpen(false); onLogout(); }}
        userName={displayName || 'Comptable'}
      />
    </>
  );
}