'use client';

// src/app/dashboard/admin/components/AdminHeader.tsx
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Bell, RefreshCw, User,
  MapPin, BarChart3, Users,
  TrendingUp, ClipboardCheck, Crown, Menu, X, LogOut,
  Settings, KeyRound, HelpCircle,
  Shield, Server, UserCog, Building2,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { ProfileDropdown } from './ProfileDropdown';
import type { DropdownExtraAction } from './ProfileDropdown';

// ============================================
// TYPES
// ============================================
export type AdminVariant = 'admin' | 'super-admin';

interface AdminHeaderProps {
  user: any;
  variant?: AdminVariant;
  onLogout: () => void;
  onRefresh: () => void;
  onNotificationsToggle: () => void;
  onDashboardToggle?: () => void;
  onPanneauxToggle?: () => void;
  onReservationsToggle?: () => void;
  onUsersToggle?: () => void;
  onStatsToggle?: () => void;
  onSupportToggle?: () => void;
  onAdminSystemToggle?: () => void;
  onFacesToggle?: () => void;
  onSuperviseursToggle?: () => void;
  onLocalisationToggle?: () => void;
  onProfilsToggle?: () => void;
  onProfileClick?: () => void;
  onChangePasswordClick?: () => void;
  onSettingsClick?: () => void;
  notificationCount: number;
}

// ============================================
// THÈMES
// ============================================
const VARIANTS: Record<AdminVariant, {
  headerBg: string;
  border: string;
  accent: string;
  subtitle: string;
  dotBorder: string;
  divider: string;
  profileEmail: string;
  title: string;
  shortTitle: string;
  iconBadge: string;
  roleBadgeColor: string;
  roleLabel: string;
}> = {
  admin: {
    headerBg: 'bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800',
    border: 'border-blue-600/50',
    accent: 'text-amber-400',
    subtitle: 'text-blue-300',
    dotBorder: 'border-blue-800',
    divider: 'bg-blue-600/50',
    profileEmail: 'text-blue-200',
    title: 'Administration',
    shortTitle: 'Admin',
    iconBadge: 'bg-amber-500/20 border-amber-500/30 shadow-amber-500/10',
    roleBadgeColor: 'bg-fuchsia-500 text-white',
    roleLabel: 'ADMIN',
  },
  'super-admin': {
    headerBg: 'bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-900',
    border: 'border-indigo-600/50',
    accent: 'text-amber-400',
    subtitle: 'text-indigo-200',
    dotBorder: 'border-blue-900',
    divider: 'bg-indigo-600/50',
    profileEmail: 'text-indigo-200',
    title: 'Super Administration',
    shortTitle: 'Super Admin',
    iconBadge: 'bg-amber-400/20 border-amber-400/40 shadow-amber-400/20',
    roleBadgeColor: 'bg-red-500 text-white',
    roleLabel: 'SUPER ADMIN',
  },
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export function AdminHeader({
  user,
  variant = 'admin',
  onLogout,
  onRefresh,
  onNotificationsToggle,
  onDashboardToggle,
  onPanneauxToggle,
  onReservationsToggle,
  onUsersToggle,
  onStatsToggle,
  onSupportToggle,
  onAdminSystemToggle,
  onFacesToggle,
  onSuperviseursToggle,
  onLocalisationToggle,
  onProfilsToggle,
  onProfileClick,
  onChangePasswordClick,
  onSettingsClick,
  notificationCount,
}: AdminHeaderProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { getUserName, getUserEmail } = useAuth();

  useEffect(() => setMounted(true), []);

  // ✅ Détection tablette/mobile : drawer actif jusqu'à 1024px (lg)
  useEffect(() => {
    const checkMobile = () => {
      const isSmall = window.innerWidth < 1024;
      if (!isSmall) setIsMobileMenuOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ Bloquer le scroll quand le drawer est ouvert
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const displayName = mounted ? getUserName() : '';
  const displayEmail = mounted ? getUserEmail() : '';
  const theme = VARIANTS[variant];

  const handleLogoClick = () => router.push('/dashboard/admin');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const isSuperAdmin = user?.profil === 'SUPER_ADMIN';
  const isAdminSystem = user?.profil === 'ADMIN_SYSTEM';

  // ✅ Actions desktop (dropdown profil)
  const extraActions: DropdownExtraAction[] = useMemo(
    () => [
      { id: 'dashboard', label: 'Tableau de bord', icon: <BarChart3 size={16} />, onClick: onDashboardToggle || (() => {}), hidden: !onDashboardToggle },
      { id: 'panneaux', label: 'Panneaux', icon: <MapPin size={16} />, onClick: onPanneauxToggle || (() => {}), hidden: !onPanneauxToggle },
      { id: 'reservations', label: 'Réservations', icon: <ClipboardCheck size={16} />, onClick: onReservationsToggle || (() => {}), hidden: !onReservationsToggle },
      { id: 'users', label: 'Utilisateurs', icon: <Users size={16} />, onClick: onUsersToggle || (() => {}), hidden: !onUsersToggle },
      { id: 'stats', label: 'Statistiques', icon: <TrendingUp size={16} />, onClick: onStatsToggle || (() => {}), hidden: !onStatsToggle },
      { id: 'faces', label: 'Faces publicitaires', icon: <Building2 size={16} />, onClick: onFacesToggle || (() => {}), hidden: !onFacesToggle },
      { id: 'superviseurs', label: 'Superviseurs', icon: <UserCog size={16} />, onClick: onSuperviseursToggle || (() => {}), hidden: !isSuperAdmin || !onSuperviseursToggle },
      { id: 'localisation', label: 'Localisation', icon: <MapPin size={16} />, onClick: onLocalisationToggle || (() => {}), hidden: !onLocalisationToggle },
      { id: 'profils', label: 'Profils', icon: <Shield size={16} />, onClick: onProfilsToggle || (() => {}), hidden: !isSuperAdmin || !onProfilsToggle },
      { id: 'admin-system', label: 'Admin Système', icon: <Server size={16} />, onClick: onAdminSystemToggle || (() => {}), hidden: !isAdminSystem && !isSuperAdmin },
      { id: 'notifications', label: 'Notifications', icon: <Bell size={16} />, onClick: onNotificationsToggle, badge: notificationCount, hidden: !onNotificationsToggle },
      { id: 'refresh', label: 'Actualiser', icon: <RefreshCw size={16} />, onClick: handleRefresh },
    ],
    [
      onDashboardToggle, onPanneauxToggle, onReservationsToggle, onUsersToggle,
      onStatsToggle, onAdminSystemToggle, onFacesToggle, onSuperviseursToggle,
      onLocalisationToggle, onProfilsToggle, onNotificationsToggle,
      isAdminSystem, isSuperAdmin, notificationCount,
    ]
  );

  // ✅ Bouton d'action desktop
  const ActionButton = ({
    onClick, icon, title, colorClass, glowColor, hidden = '',
  }: {
    onClick?: () => void;
    icon: React.ReactNode;
    title: string;
    colorClass: string;
    glowColor: string;
    hidden?: string;
  }) => {
    if (!onClick) return null;
    return (
      <button
        onClick={onClick}
        className={`
          group relative p-2 rounded-xl
          transition-all duration-300 ease-out
          hover:scale-110 active:scale-95
          ${colorClass}
          shadow-lg hover:shadow-xl
          border border-white/10
          ${hidden}
        `}
        title={title}
      >
        <span className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 blur-lg -z-10 ${glowColor}`} />
        <span className="relative z-10 block transition-transform duration-300 group-hover:rotate-6">
          {icon}
        </span>
      </button>
    );
  };

  // ✅ Actions du drawer mobile/tablette
  const mobileMenuActions = useMemo(() => {
    const actions: Array<{
      id: string;
      label: string;
      icon: React.ReactNode;
      onClick?: () => void;
      badge?: number;
      color: string;
    }> = [];

    if (onDashboardToggle) actions.push({ id: 'dashboard', label: 'Tableau de bord', icon: <BarChart3 size={18} />, onClick: onDashboardToggle, color: 'text-blue-400' });
    if (onPanneauxToggle) actions.push({ id: 'panneaux', label: 'Panneaux', icon: <MapPin size={18} />, onClick: onPanneauxToggle, color: 'text-emerald-400' });
    if (onReservationsToggle) actions.push({ id: 'reservations', label: 'Réservations', icon: <ClipboardCheck size={18} />, onClick: onReservationsToggle, color: 'text-amber-400' });
    if (onUsersToggle) actions.push({ id: 'users', label: 'Utilisateurs', icon: <Users size={18} />, onClick: onUsersToggle, color: 'text-violet-400' });
    if (onStatsToggle) actions.push({ id: 'stats', label: 'Statistiques', icon: <TrendingUp size={18} />, onClick: onStatsToggle, color: 'text-cyan-400' });
    if (onFacesToggle) actions.push({ id: 'faces', label: 'Faces publicitaires', icon: <Building2 size={18} />, onClick: onFacesToggle, color: 'text-orange-400' });
    if (isSuperAdmin && onSuperviseursToggle) actions.push({ id: 'superviseurs', label: 'Superviseurs', icon: <UserCog size={18} />, onClick: onSuperviseursToggle, color: 'text-pink-400' });
    if (onLocalisationToggle) actions.push({ id: 'localisation', label: 'Localisation', icon: <MapPin size={18} />, onClick: onLocalisationToggle, color: 'text-teal-400' });
    if (isSuperAdmin && onProfilsToggle) actions.push({ id: 'profils', label: 'Profils', icon: <Shield size={18} />, onClick: onProfilsToggle, color: 'text-red-400' });
    if (onAdminSystemToggle) actions.push({ id: 'admin-system', label: 'Admin Système', icon: <Server size={18} />, onClick: onAdminSystemToggle, color: 'text-indigo-400' });
    if (onSupportToggle) actions.push({ id: 'support', label: 'Support', icon: <HelpCircle size={18} />, onClick: onSupportToggle, color: 'text-sky-400' });
    if (onNotificationsToggle) actions.push({ id: 'notifications', label: 'Notifications', icon: <Bell size={18} />, onClick: onNotificationsToggle, badge: notificationCount, color: 'text-yellow-400' });
    actions.push({ id: 'refresh', label: 'Actualiser', icon: <RefreshCw size={18} />, onClick: handleRefresh, color: 'text-white/60' });

    return actions;
  }, [
    onDashboardToggle, onPanneauxToggle, onReservationsToggle, onUsersToggle,
    onStatsToggle, onFacesToggle, onSuperviseursToggle, onLocalisationToggle,
    onProfilsToggle, onAdminSystemToggle, onSupportToggle, onNotificationsToggle,
    isSuperAdmin, notificationCount,
  ]);

  const handleMobileAction = (action?: () => void) => () => {
    setIsMobileMenuOpen(false);
    action?.();
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      {/* ============================================
          HEADER — responsive phone → 4K
          ============================================ */}
      <header className={`${theme.headerBg} shadow-2xl sticky top-0 z-50 border-b ${theme.border} w-full`}>
        <div className="
          w-full
          px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8
          xl:px-10 2xl:px-12
          py-2 sm:py-2.5 md:py-3
        ">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 md:gap-3">

            {/* ============ 1. LOGO + TITRE ============ */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 min-w-0">
              <button
                onClick={handleLogoClick}
                className="relative group transition-all duration-500 hover:scale-110 active:scale-95 flex-shrink-0"
                title="Accueil Admin"
              >
                <div className={`w-8 h-8 xs:w-9 xs:h-9 md:w-10 md:h-10 rounded-xl ${theme.iconBadge} flex items-center justify-center border shadow-lg overflow-hidden`}>
                  <Image
                    src="/icons/icon-32x32.png"
                    alt="Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                    priority
                  />
                </div>
                <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-400 rounded-full border-2 ${theme.dotBorder} animate-pulse`} />

                {isSuperAdmin && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-md">
                    <Crown className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-950" />
                  </div>
                )}
                {isAdminSystem && !isSuperAdmin && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full bg-gradient-to-br from-fuchsia-400 to-fuchsia-600 flex items-center justify-center shadow-md">
                    <Shield className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                  </div>
                )}
              </button>

              {/* Titre desktop (sm+) */}
              <div className="hidden sm:block min-w-0">
                <h1 className="text-base md:text-lg lg:text-xl font-bold text-white tracking-tight flex items-center gap-1.5 md:gap-2">
                  <span className={theme.accent}>GDP</span>
                  <span className="text-white/60">|</span>
                  <span className="text-white truncate">{theme.title}</span>
                  <span className={`hidden md:inline-block text-[9px] px-1.5 py-0.5 rounded-full font-bold tracking-wider flex-shrink-0 ${theme.roleBadgeColor}`}>
                    {theme.roleLabel}
                  </span>
                </h1>
                <p className={`hidden md:block text-[9px] ${theme.subtitle} uppercase tracking-[0.15em] font-bold truncate`}>
                  {user?.profilLibelle || 'Administration Système'}
                </p>
              </div>

              {/* Titre mobile (< sm) */}
              <div className="sm:hidden min-w-0">
                <h1 className="text-xs xs:text-sm font-bold text-white flex items-center gap-1">
                  <span className={theme.accent}>GDP</span>
                  <span className="text-white/60">|</span>
                  <span className="text-white">{theme.shortTitle}</span>
                </h1>
              </div>
            </div>

            <div className="flex-1 min-w-0" />

            {/* ============ 2. PROFIL desktop (lg+) ============ */}
            {mounted && displayName && (
              <div className="hidden lg:flex items-center gap-2 flex-shrink-0 mr-1 xl:mr-2">
                <div className="text-right max-w-[140px] xl:max-w-[200px]">
                  <p className="text-xs xl:text-sm font-semibold text-white truncate leading-tight">
                    {displayName}
                  </p>
                  <p className={`text-[9px] xl:text-[10px] ${theme.profileEmail} truncate italic leading-tight`}>
                    {displayEmail}
                  </p>
                </div>
              </div>
            )}

            <div className={`hidden lg:block w-px h-7 xl:h-8 ${theme.divider} mx-0.5 xl:mx-1`} />

            {/* ============ 3. ICÔNES DESKTOP ============ */}
            <div className="hidden lg:flex items-center gap-1 xl:gap-1.5 flex-shrink-0">
              <ActionButton
                onClick={onDashboardToggle}
                icon={<BarChart3 className="w-4 h-4 text-white" />}
                title="Tableau de bord"
                colorClass="bg-blue-600 hover:bg-blue-500"
                glowColor="bg-blue-400"
              />
              <ActionButton
                onClick={onPanneauxToggle}
                icon={<MapPin className="w-4 h-4 text-white" />}
                title="Panneaux"
                colorClass="bg-emerald-600 hover:bg-emerald-500"
                glowColor="bg-emerald-400"
              />
              <ActionButton
                onClick={onReservationsToggle}
                icon={<ClipboardCheck className="w-4 h-4 text-white" />}
                title="Réservations"
                colorClass="bg-amber-600 hover:bg-amber-500"
                glowColor="bg-amber-400"
              />
              <ActionButton
                onClick={onUsersToggle}
                icon={<Users className="w-4 h-4 text-white" />}
                title="Utilisateurs"
                colorClass="bg-violet-600 hover:bg-violet-500"
                glowColor="bg-violet-400"
              />
              <ActionButton
                onClick={onStatsToggle}
                icon={<TrendingUp className="w-4 h-4 text-white" />}
                title="Statistiques"
                colorClass="bg-cyan-600 hover:bg-cyan-500"
                glowColor="bg-cyan-400"
                hidden="hidden xl:block"
              />
              <ActionButton
                onClick={isSuperAdmin ? onSuperviseursToggle : undefined}
                icon={<UserCog className="w-4 h-4 text-white" />}
                title="Superviseurs"
                colorClass="bg-pink-600 hover:bg-pink-500"
                glowColor="bg-pink-400"
                hidden="hidden 2xl:block"
              />
              <ActionButton
                onClick={onAdminSystemToggle}
                icon={<Server className="w-4 h-4 text-white" />}
                title="Admin Système"
                colorClass="bg-indigo-600 hover:bg-indigo-500"
                glowColor="bg-indigo-400"
                hidden="hidden 2xl:block"
              />

              {/* Notifications */}
              {onNotificationsToggle && (
                <button
                  onClick={onNotificationsToggle}
                  className="group relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </button>
              )}

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                className="group relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                title="Actualiser"
              >
                <RefreshCw className={`w-4 h-4 transition-transform duration-300 group-hover:rotate-180 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className={`hidden lg:block w-px h-7 xl:h-8 ${theme.divider} mx-0.5 xl:mx-1`} />

            {/* ============ 4. AVATAR + DROPDOWN (desktop lg+) ============ */}
            {mounted && displayName && (
              <div className="hidden lg:block flex-shrink-0">
                <ProfileDropdown
                  userName={displayName}
                  userEmail={displayEmail}
                  userProfil={user?.profil || ''}
                  onLogout={handleLogoutClick}
                  onProfileClick={onProfileClick}
                  onChangePasswordClick={onChangePasswordClick}
                  onSettingsClick={onSettingsClick}
                  onHelpClick={() => console.log('Aide')}
                  extraActions={[]}
                />
              </div>
            )}

            {/* ============ 5. BOUTON MENU MOBILE/TABLETTE (< lg) ============ */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="
                lg:hidden flex-shrink-0 relative
                p-2 rounded-xl
                bg-white/10 hover:bg-white/20
                border border-white/20
                text-white
                transition-all duration-300
                active:scale-95
              "
              title="Menu"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ============================================
          DRAWER MOBILE / TABLETTE (< lg)
          ============================================ */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100]">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Panneau */}
          <div className="
            absolute top-0 right-0 h-full
            w-[88%] xs:w-[85%] sm:w-[70%] md:w-[420px]
            bg-slate-900
            shadow-2xl
            flex flex-col
            animate-slideInRight
          ">
            {/* ---- En-tête drawer ---- */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0 ring-2 ring-white/10">
                  {displayName?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    {displayName || 'Administrateur'}
                  </p>
                  <p className="text-white/50 text-[11px] truncate">
                    {displayEmail || ''}
                  </p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${theme.roleBadgeColor} inline-block mt-0.5`}>
                    {theme.roleLabel}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition flex-shrink-0"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ---- Contenu scrollable ---- */}
            <div className="flex-1 overflow-y-auto overscroll-contain mobile-menu-scroll px-3 py-3">

              {/* Section Modules Admin */}
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold px-3 mb-1.5 mt-1">
                Modules Admin
              </p>
              <div className="space-y-0.5 mb-4">
                {mobileMenuActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={handleMobileAction(action.onClick)}
                    className="
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      text-white/90 hover:text-white hover:bg-white/5
                      text-sm font-medium
                      transition-colors duration-150
                      active:bg-white/10
                    "
                  >
                    <span className={`flex-shrink-0 ${action.color}`}>{action.icon}</span>
                    <span className="flex-1 text-left truncate">{action.label}</span>
                    {action.badge !== undefined && action.badge > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                        {action.badge > 99 ? '99+' : action.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Section Mon compte */}
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold px-3 mb-1.5">
                Mon compte
              </p>
              <div className="space-y-0.5 mb-4">
                {onProfileClick && (
                  <button
                    onClick={handleMobileAction(onProfileClick)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/90 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors duration-150 active:bg-white/10"
                  >
                    <User size={18} className="flex-shrink-0 text-white/60" />
                    <span>Mon profil</span>
                  </button>
                )}
                {onChangePasswordClick && (
                  <button
                    onClick={handleMobileAction(onChangePasswordClick)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/90 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors duration-150 active:bg-white/10"
                  >
                    <KeyRound size={18} className="flex-shrink-0 text-white/60" />
                    <span>Changer le mot de passe</span>
                  </button>
                )}
                {onSettingsClick && (
                  <button
                    onClick={handleMobileAction(onSettingsClick)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/90 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors duration-150 active:bg-white/10"
                  >
                    <Settings size={18} className="flex-shrink-0 text-white/60" />
                    <span>Paramètres</span>
                  </button>
                )}
                <button
                  onClick={() => console.log('Aide')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/90 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors duration-150 active:bg-white/10"
                >
                  <HelpCircle size={18} className="flex-shrink-0 text-white/60" />
                  <span>Aide</span>
                </button>
              </div>

              {/* Section Déconnexion */}
              <div className="pt-3 mt-2 border-t border-white/10 pb-4">
                <button
                  onClick={handleLogoutClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm font-medium transition-colors duration-150 active:bg-red-500/20"
                >
                  <LogOut size={18} className="flex-shrink-0" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          setIsLogoutModalOpen(false);
          onLogout();
        }}
        userName={displayName || 'Administrateur'}
      />

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideInRight { animation: slideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1); }

        /* Scrollbar fine et élégante pour le drawer */
        .mobile-menu-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
        }
        .mobile-menu-scroll::-webkit-scrollbar { width: 6px; }
        .mobile-menu-scroll::-webkit-scrollbar-track { background: transparent; }
        .mobile-menu-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }
        .mobile-menu-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* Support des très petits écrans (iPhone SE 320px) */
        @media (max-width: 360px) {
          .mobile-menu-scroll { padding: 8px; }
        }
      `}</style>
    </>
  );
}