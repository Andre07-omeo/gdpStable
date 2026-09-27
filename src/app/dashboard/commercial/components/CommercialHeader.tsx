'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/CommercialHeader.tsx
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Bell, RefreshCw, User,
  MapPin, BarChart3, Users,
  BookOpen, Download, TrendingUp,
  ClipboardCheck, Crown, Building2,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getFeaturesByProfil } from '../types/commercial.types';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { ProfileDropdown, DropdownExtraAction } from './ProfileDropdown';

interface CommercialHeaderProps {
  user: any;
  onLogout: () => void;
  onRefresh: () => void;
  onNotificationsToggle: () => void;
  onAdminToggle?: () => void;
  onCatalogueToggle?: () => void;
  onMapToggle?: () => void;
  onExportToggle?: () => void;
  onReportsToggle?: () => void;
  onPredictionsToggle?: () => void;
  onTeamManagementToggle?: () => void;
  onReservationsManagementToggle?: () => void;
  onProfileClick?: () => void;
  onChangePasswordClick?: () => void;
  onSettingsClick?: () => void;
  notificationCount: number;
  /** 🎨 Variante visuelle : 'commercial' (bleu) | 'dg' (émeraude/or) */
  variant?: 'commercial' | 'dg' | 'superviseur';
}

// 🎨 Thèmes par variante
const VARIANTS = {
  commercial: {
    headerBg: 'bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800',
    border: 'border-blue-600/50',
    accent: 'text-amber-400',
    subtitle: 'text-blue-300',
    dotBorder: 'border-blue-800',
    divider: 'bg-blue-600/50',
    profileEmail: 'text-blue-200',
    title: 'Commercial',
    shortTitle: 'Com',
    iconBadge: 'bg-amber-500/20 border-amber-500/30 shadow-amber-500/10',
  },
  dg: {
    headerBg: 'bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900',
    border: 'border-emerald-700/50',
    accent: 'text-amber-400',
    subtitle: 'text-amber-200/80',
    dotBorder: 'border-emerald-900',
    divider: 'bg-emerald-600/50',
    profileEmail: 'text-amber-200/90',
    title: 'Direction Générale',
    shortTitle: 'DG',
    iconBadge: 'bg-amber-400/20 border-amber-400/40 shadow-amber-400/20',
  },
  superviseur: {
    headerBg: 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800',
    border: 'border-slate-600/50',
    accent: 'text-cyan-400',
    subtitle: 'text-slate-300',
    dotBorder: 'border-slate-800',
    divider: 'bg-slate-600/50',
    profileEmail: 'text-slate-200',
    title: 'Superviseur',
    shortTitle: 'Sup',
    iconBadge: 'bg-cyan-500/20 border-cyan-500/30 shadow-cyan-500/10',
  },
};

export function CommercialHeader({
  user,
  onLogout,
  onRefresh,
  onNotificationsToggle,
  onAdminToggle,
  onCatalogueToggle,
  onMapToggle,
  onExportToggle,
  onReportsToggle,
  onPredictionsToggle,
  onTeamManagementToggle,
  onReservationsManagementToggle,
  onProfileClick,
  onChangePasswordClick,
  onSettingsClick,
  notificationCount,
  variant = 'commercial',
}: CommercialHeaderProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { getUserName, getUserEmail } = useAuth();

  useEffect(() => setMounted(true), []);

  // ✅ Détection mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const displayName = mounted ? getUserName() : '';
  const displayEmail = mounted ? getUserEmail() : '';

  const theme = VARIANTS[variant];

  // ✅ Bouton logo : va vers le dashboard correspondant au profil
  const handleLogoClick = () => {
    const profil = user?.profil;
    if (profil === 'DG' || profil === 'SUPER_ADMIN') router.push('/dashboard/dg');
    else if (profil === 'SUPERVISEUR') router.push('/dashboard/superviseur');
    else router.push('/dashboard/commercial');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  // ✅ Ouvre la modale de déconnexion proprement
  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const features = user ? getFeaturesByProfil(user.profil) : null;
  const isAdmin =
    user?.profil === 'SUPER_ADMIN' || user?.profil === 'ADMIN_SYSTEM';

  // ✅ Badge de rôle (visible selon profil)
  const roleBadge = useMemo(() => {
    const profil = user?.profil;
    if (profil === 'DG') return { label: 'DG', color: 'bg-amber-500 text-emerald-950' };
    if (profil === 'SUPER_ADMIN') return { label: 'SUPER ADMIN', color: 'bg-red-500 text-white' };
    if (profil === 'ADMIN_SYSTEM') return { label: 'ADMIN', color: 'bg-fuchsia-500 text-white' };
    if (profil === 'SUPERVISEUR') return { label: 'SUP', color: 'bg-cyan-500 text-white' };
    return null;
  }, [user?.profil]);

  // ✅ Extra actions mémoïsées pour la perf
  const extraActions: DropdownExtraAction[] = useMemo(
    () => [
      {
        id: 'catalogue',
        label: 'Catalogue',
        icon: <BookOpen size={16} />,
        onClick: () => onCatalogueToggle?.(),
        hidden: !onCatalogueToggle,
      },
      {
        id: 'map',
        label: 'Carte interactive',
        icon: <MapPin size={16} />,
        onClick: () => onMapToggle?.(),
        hidden: !onMapToggle,
      },
      {
        id: 'export',
        label: 'Exporter les données',
        icon: <Download size={16} />,
        onClick: () => onExportToggle?.(),
        hidden: !onExportToggle,
      },
      {
        id: 'team',
        label: "Gestion de l'équipe",
        icon: <Users size={16} />,
        onClick: () => onTeamManagementToggle?.(),
        hidden: !features?.canManageTeam || !onTeamManagementToggle,
      },
      {
        id: 'reservations',
        label: 'Gestion des réservations',
        icon: <ClipboardCheck size={16} />,
        onClick: () => onReservationsManagementToggle?.(),
        hidden: !features?.canModifyReservations || !onReservationsManagementToggle,
      },
      {
        id: 'reports',
        label: 'Rapports',
        icon: <BarChart3 size={16} />,
        onClick: () => onReportsToggle?.(),
        hidden: !features?.canViewReports || !onReportsToggle,
      },
      {
        id: 'predictions',
        label: 'Prédictions',
        icon: <TrendingUp size={16} />,
        onClick: () => onPredictionsToggle?.(),
        hidden: !features?.canViewPredictions || !onPredictionsToggle,
      },
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
      {
        id: 'admin',
        label: 'Administration',
        icon: <User size={16} />,
        onClick: () => onAdminToggle?.(),
        hidden: !isAdmin || !onAdminToggle,
      },
    ],
    [
      onCatalogueToggle, onMapToggle, onExportToggle,
      onTeamManagementToggle, onReservationsManagementToggle,
      onReportsToggle, onPredictionsToggle, onNotificationsToggle,
      onAdminToggle, isAdmin, features, notificationCount,
    ]
  );

  // ✅ ActionButton
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
          group relative p-1.5 sm:p-2 rounded-xl
          transition-all duration-300 ease-out
          hover:scale-110 active:scale-95
          ${colorClass}
          shadow-lg hover:shadow-xl
          border border-white/10
          ${hidden}
        `}
        title={title}
      >
        <span
          className={`
            absolute inset-0 rounded-xl
            opacity-0 group-hover:opacity-60
            transition-opacity duration-500
            blur-lg -z-10
            ${glowColor}
          `}
        />
        <span className="relative z-10 block transition-transform duration-300 group-hover:rotate-6">
          {icon}
        </span>
      </button>
    );
  };

  return (
    <>
      <header className={`${theme.headerBg} shadow-2xl sticky top-0 z-50 border-b ${theme.border}`}>
        <div className="px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">

            {/* 1. LOGO + TITRE */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={handleLogoClick}
                className="relative group transition-all duration-500 hover:scale-110 active:scale-95"
                title="Accueil"
              >
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${theme.iconBadge} flex items-center justify-center border shadow-lg overflow-hidden`}>
                  <Image
                    src="/icons/icon-32x32.png"
                    alt="Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                    priority
                  />
                </div>
                <div className={`absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 ${theme.dotBorder} animate-pulse`} />

                {/* 👑 Couronne dorée pour le DG */}
                {variant === 'dg' && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-md">
                    <Crown className="w-3 h-3 text-emerald-950" />
                  </div>
                )}
              </button>

              {/* Titre desktop */}
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span className={theme.accent}>GDP</span>
                  <span className="text-white/60">|</span>
                  <span className="text-white">{theme.title}</span>
                  {roleBadge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold tracking-wider ${roleBadge.color}`}>
                      {roleBadge.label}
                    </span>
                  )}
                </h1>
                <p className={`text-[9px] ${theme.subtitle} uppercase tracking-[0.15em] font-bold`}>
                  {user?.profilLibelle || `Espace ${variant}`}
                </p>
              </div>

              {/* Titre mobile */}
              <div className="sm:hidden">
                <h1 className="text-base font-bold text-white flex items-center gap-1">
                  <span className={theme.accent}>GDP</span>
                  <span className="text-white/60">|</span>
                  <span className="text-white">{theme.shortTitle}</span>
                </h1>
              </div>
            </div>

            <div className="flex-1" />

            {/* 2. PROFIL desktop */}
            {mounted && displayName && (
              <div className="hidden lg:flex items-center gap-2 flex-shrink-0 mr-2">
                <div className="text-right max-w-[200px]">
                  <p className="text-sm font-semibold text-white truncate leading-tight">
                    {displayName}
                  </p>
                  <p className={`text-[10px] ${theme.profileEmail} truncate italic leading-tight`}>
                    {displayEmail}
                  </p>
                </div>
              </div>
            )}

            <div className={`hidden lg:block w-px h-8 ${theme.divider} mx-1`} />

            {/* 3. ICÔNES DESKTOP */}
            <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              <ActionButton
                onClick={onCatalogueToggle}
                icon={<BookOpen className="w-4 h-4 text-white" />}
                title="Catalogue"
                colorClass="bg-blue-600 hover:bg-blue-500"
                glowColor="bg-blue-400"
              />

              <ActionButton
                onClick={onMapToggle}
                icon={<MapPin className="w-4 h-4 text-white" />}
                title="Carte interactive"
                colorClass="bg-emerald-600 hover:bg-emerald-500"
                glowColor="bg-emerald-400"
              />

              <ActionButton
                onClick={onExportToggle}
                icon={<Download className="w-4 h-4 text-white" />}
                title="Exporter"
                colorClass="bg-violet-600 hover:bg-violet-500"
                glowColor="bg-violet-400"
                hidden="hidden md:block"
              />

              <ActionButton
                onClick={features?.canManageTeam ? onTeamManagementToggle : undefined}
                icon={<Users className="w-4 h-4 text-white" />}
                title="Gestion de l'équipe"
                colorClass="bg-orange-600 hover:bg-orange-500"
                glowColor="bg-orange-400"
                hidden="hidden md:block"
              />

              <ActionButton
                onClick={features?.canModifyReservations ? onReservationsManagementToggle : undefined}
                icon={<ClipboardCheck className="w-4 h-4 text-white" />}
                title="Gestion des réservations"
                colorClass="bg-amber-600 hover:bg-amber-500"
                glowColor="bg-amber-400"
                hidden="hidden lg:block"
              />

              <ActionButton
                onClick={features?.canViewReports ? onReportsToggle : undefined}
                icon={<BarChart3 className="w-4 h-4 text-white" />}
                title="Rapports"
                colorClass="bg-cyan-600 hover:bg-cyan-500"
                glowColor="bg-cyan-400"
                hidden="hidden lg:block"
              />

              <ActionButton
                onClick={features?.canViewPredictions ? onPredictionsToggle : undefined}
                icon={<TrendingUp className="w-4 h-4 text-white" />}
                title="Prédictions"
                colorClass="bg-indigo-600 hover:bg-indigo-500"
                glowColor="bg-indigo-400"
                hidden="hidden xl:block"
              />

              {onNotificationsToggle && (
                <button
                  onClick={onNotificationsToggle}
                  className="
                    group relative p-2 rounded-xl
                    bg-white/5 hover:bg-white/10
                    border border-white/10
                    text-white/80 hover:text-white
                    transition-all duration-300 ease-out
                    hover:scale-110 active:scale-95
                  "
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

              <button
                onClick={handleRefresh}
                className="
                  group relative p-2 rounded-xl
                  bg-white/5 hover:bg-white/10
                  border border-white/10
                  text-white/80 hover:text-white
                  transition-all duration-300 ease-out
                  hover:scale-110 active:scale-95
                "
                title="Actualiser"
              >
                <RefreshCw
                  className={`w-4 h-4 transition-transform duration-300 group-hover:rotate-180 ${
                    isRefreshing ? 'animate-spin' : ''
                  }`}
                />
              </button>

              <ActionButton
                onClick={isAdmin ? onAdminToggle : undefined}
                icon={<User className="w-4 h-4 text-white" />}
                title="Administration"
                colorClass="bg-fuchsia-600 hover:bg-fuchsia-500"
                glowColor="bg-fuchsia-400"
                hidden="hidden lg:block"
              />
            </div>

            <div className={`hidden sm:block w-px h-8 ${theme.divider} mx-1`} />

            {/* 4. AVATAR + DROPDOWN */}
            {mounted && displayName && (
              <div className="flex-shrink-0">
                <ProfileDropdown
                  userName={displayName}
                  userEmail={displayEmail}
                  userProfil={user?.profil || ''}
                  onLogout={handleLogoutClick}
                  onProfileClick={onProfileClick}
                  onChangePasswordClick={onChangePasswordClick}
                  onSettingsClick={onSettingsClick}
                  onHelpClick={() => console.log('Aide')}
                  extraActions={isMobile ? extraActions : []}
                />
              </div>
            )}
          </div>
        </div>
      </header>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          setIsLogoutModalOpen(false);
          onLogout();
        }}
        userName={displayName || 'Utilisateur'}
      />
    </>
  );
}